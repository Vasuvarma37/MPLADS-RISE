"""
MPLADS RISE — RAG Service (ChromaDB + Google Gemini)
Provides AI-powered Q&A over MPLADS guidelines and circulars.
"""
import logging
from typing import Optional
import chromadb
import google.generativeai as genai
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# MPLADS guidelines knowledge base
MPLADS_KNOWLEDGE = [
    {
        "id": "mplads_001",
        "text": "MPLADS entitlement is ₹5 crore per MP per year. The funds are non-lapsable and can be carried forward.",
        "source": "MPLADS Guidelines 2016",
        "category": "entitlement"
    },
    {
        "id": "mplads_002",
        "text": "Works under MPLADS should be completed within 12 months of sanction. Extensions require approval from District Authority.",
        "source": "MPLADS Guidelines 2016",
        "category": "completion"
    },
    {
        "id": "mplads_003",
        "text": "Implementing Agencies must upload photographs at each stage of completion on the eSAKSHI portal before releasing payments.",
        "source": "eSAKSHI Portal Guidelines",
        "category": "documentation"
    },
    {
        "id": "mplads_004",
        "text": "Payment anomaly: If financial progress exceeds physical progress by more than 40%, the project should be flagged for audit review.",
        "source": "RISE Internal Policy",
        "category": "risk_rule"
    },
    {
        "id": "mplads_005",
        "text": "Works recommended by MPs must be for durable public assets in the MP's constituency. Works of personal, religious, or commercial nature are not eligible.",
        "source": "MPLADS Guidelines 2016",
        "category": "eligibility"
    },
    {
        "id": "mplads_006",
        "text": "District Authority must verify works within 30 days of MP recommendation. Unsanctioned works within 3 months are auto-flagged.",
        "source": "MPLADS Operational Manual",
        "category": "sanction"
    },
    {
        "id": "mplads_007",
        "text": "Use Completion Certificate (UC) must be submitted by Implementing Agency after work completion. Missing UCs trigger recovery proceedings.",
        "source": "MPLADS Circular 2023",
        "category": "compliance"
    },
    {
        "id": "mplads_008",
        "text": "Works costing more than ₹25 lakhs require mandatory third-party quality inspection before final payment.",
        "source": "MPLADS Quality Guidelines",
        "category": "quality"
    },
    {
        "id": "mplads_009",
        "text": "Duplicate work detection: Two works in the same district with >85% text similarity are flagged for review to prevent double-funding.",
        "source": "RISE ML Policy",
        "category": "risk_rule"
    },
    {
        "id": "mplads_010",
        "text": "For projects delayed more than 180 days past expected completion, the District Authority must submit a recovery plan to the State Nodal Authority.",
        "source": "MPLADS Operational Manual",
        "category": "delay"
    },
]


class RAGService:
    def __init__(self):
        self._client = None
        self._collection = None
        self._gemini_model = None
        self._initialized = False

    def initialize(self):
        """Lazy init — called on first use."""
        if self._initialized:
            return

        # Setup Gemini
        if settings.gemini_api_key:
            genai.configure(api_key=settings.gemini_api_key)
            self._gemini_model = genai.GenerativeModel(settings.gemini_model)
            logger.info("Gemini AI initialized")
        else:
            logger.warning("No GEMINI_API_KEY — AI responses will be limited")

        # Setup ChromaDB
        try:
            self._client = chromadb.HttpClient(
                host=settings.chroma_host,
                port=settings.chroma_port
            )
            self._collection = self._client.get_or_create_collection(
                name=settings.chroma_collection,
                metadata={"hnsw:space": "cosine"}
            )
            self._seed_knowledge_base()
            logger.info("ChromaDB initialized")
        except Exception as e:
            logger.warning(f"ChromaDB connection failed: {e} — using persistent fallback")
            self._client = chromadb.PersistentClient(path="./chroma_db")
            self._collection = self._client.get_or_create_collection(
                name=settings.chroma_collection
            )
            self._seed_knowledge_base()

        self._initialized = True

    def _seed_knowledge_base(self):
        """Seed ChromaDB with MPLADS guidelines."""
        if self._collection.count() > 0:
            return  # Already seeded

        self._collection.add(
            ids=[doc["id"] for doc in MPLADS_KNOWLEDGE],
            documents=[doc["text"] for doc in MPLADS_KNOWLEDGE],
            metadatas=[{"source": doc["source"], "category": doc["category"]}
                       for doc in MPLADS_KNOWLEDGE],
        )
        logger.info(f"Seeded {len(MPLADS_KNOWLEDGE)} documents into ChromaDB")

    def retrieve_context(self, query: str, n_results: int = 3) -> list:
        """Retrieve relevant MPLADS guidelines for a query."""
        self.initialize()
        try:
            results = self._collection.query(
                query_texts=[query],
                n_results=min(n_results, self._collection.count()),
            )
            docs = results.get("documents", [[]])[0]
            metas = results.get("metadatas", [[]])[0]
            return [{"text": d, "source": m.get("source", "")}
                    for d, m in zip(docs, metas)]
        except Exception as e:
            logger.error(f"ChromaDB query error: {e}")
            return []

    def ask(self, question: str, project_context: Optional[dict] = None) -> dict:
        """
        RAG-powered Q&A about MPLADS.
        - Retrieves relevant guidelines
        - Adds project context if provided
        - Generates answer via Gemini
        """
        self.initialize()

        # Retrieve context
        context_docs = self.retrieve_context(question)
        context_text = "\n".join([f"- {d['text']} [Source: {d['source']}]"
                                   for d in context_docs])

        # Build project context string
        proj_ctx = ""
        if project_context:
            pid = project_context.get("project_id", "N/A")
            score = project_context.get("risk_score", "N/A")
            level = project_context.get("risk_level", "N/A")
            primary = project_context.get("primary_risk", "N/A")
            proj_ctx = (
                f"\nCurrent Project Context:\n"
                f"- Project ID: {pid}\n"
                f"- Risk Score: {score}/100 ({level})\n"
                f"- Primary Risk: {primary}\n"
            )

        prompt = f"""You are an expert MPLADS (Members of Parliament Local Area Development Scheme) audit advisor for the Government of India.
Answer the following question accurately and concisely based on the retrieved guidelines and context.
If you don't know something, say so clearly — do not make up facts.

Retrieved Guidelines:
{context_text}
{proj_ctx}
Question: {question}

Provide a clear, professional response suitable for a government auditor. Use numbered points for complex answers."""

        if self._gemini_model:
            try:
                response = self._gemini_model.generate_content(prompt)
                answer = response.text
            except Exception as e:
                logger.error(f"Gemini error: {e}")
                answer = self._fallback_answer(question, context_docs)
        else:
            answer = self._fallback_answer(question, context_docs)

        return {
            "answer": answer,
            "sources": [d["source"] for d in context_docs],
            "context_used": len(context_docs),
        }

    def _fallback_answer(self, question: str, context_docs: list) -> str:
        """Fallback when Gemini unavailable."""
        if context_docs:
            return (
                f"Based on MPLADS guidelines:\n\n" +
                "\n".join([f"• {d['text']}" for d in context_docs]) +
                "\n\n[Note: Add GEMINI_API_KEY for enhanced AI responses]"
            )
        return "I couldn't find relevant information. Please check the MPLADS guidelines at mplads.mospi.gov.in"


rag_service = RAGService()

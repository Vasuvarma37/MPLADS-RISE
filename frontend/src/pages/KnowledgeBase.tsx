import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle2, Loader2, Database } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { aiApi } from '../api/client';

export default function KnowledgeBase() {
  const [source, setSource] = useState('');
  const [category, setCategory] = useState('Guidelines');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [docs, setDocs] = useState<any[]>([]);

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    try {
      const res = await aiApi.knowledge();
      setDocs(res.data);
    } catch (error) {
      console.error('Failed to fetch docs', error);
    }
  };

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !source) return;
    
    setLoading(true);
    try {
      await aiApi.uploadFile(source, category, file);
      setSuccess(true);
      setFile(null);
      setSource('');
      setTimeout(() => setSuccess(false), 3000);
      fetchDocs();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Database className="w-6 h-6 text-blue-600" />
          Settings & Knowledge Base
        </h1>
        <p className="text-slate-500 mt-1">Upload official guidelines and circulars to train the AI Assistant.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Upload className="w-5 h-5 text-blue-600" />
          Upload New Document
        </h2>
        
        {success && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 text-sm border border-green-200">
            <CheckCircle2 className="w-4 h-4" />
            Document successfully indexed in the AI vector database.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Document Source / Title</label>
              <input 
                type="text" 
                value={source}
                onChange={e => setSource(e.target.value)}
                required
                placeholder="e.g. MPLADS Guidelines 2026"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select 
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option>Guidelines</option>
                <option>Circulars</option>
                <option>Notices</option>
                <option>Other</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Document File (PDF/Image)</label>
            <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'}`}>
              <input {...getInputProps()} />
              {file ? (
                <div className="text-sm font-medium text-blue-700 flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4" /> {file.name}
                </div>
              ) : (
                <div className="text-sm font-medium text-slate-600">
                  {isDragActive ? 'Drop the file here...' : 'Drag & drop a file here, or click to select'}
                </div>
              )}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading || !file || !source}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {loading ? 'Indexing in Vector DB...' : 'Upload to Knowledge Base'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
          <FileText className="w-5 h-5 text-blue-600" />
          Indexed Documents
        </h2>
        
        {docs.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">No documents indexed yet.</p>
        ) : (
          <div className="space-y-3">
            {docs.map(doc => (
              <div key={doc.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                <div className="bg-blue-100 p-2 rounded text-blue-700">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-900">{doc.source}</h3>
                  <div className="flex gap-2 mt-1 text-xs text-slate-500">
                    <span className="bg-slate-100 px-2 py-0.5 rounded">{doc.category}</span>
                    <span>ID: {doc.id}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

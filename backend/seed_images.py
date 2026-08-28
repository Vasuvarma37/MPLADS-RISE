import os
import shutil
import time
from database import SessionLocal
from models.orm_models import ProjectDocument
import uuid

# Map of Project IDs to lists of image artifact names
ARTIFACT_DIR = r"C:\Users\VASU\.gemini\antigravity-ide\brain\eab0ba20-b6cd-4db4-a13f-96855a0ea0be"

seed_mapping = {
    "MPL-2026-00128": [ # Building
        "building_construction_start_1787880591617.jpg",
        "building_construction_progress_1787880620389.jpg",
        "building_construction_complete_1_1787880647924.jpg",
        "building_construction_complete_2_1787880675618.jpg"
    ],
    "MPL-2026-00401": [ # Road
        "road_construction_start_1787880311118.jpg",
        "road_construction_progress_1787880373641.jpg",
        "road_construction_complete_1_1787880415730.jpg",
        "road_construction_complete_2_1787880448375.jpg"
    ],
    "MPL-2026-00592": [ # Water
        "water_construction_start_1787880950199.jpg",
        "water_construction_progress_1787880979280.jpg",
        "water_construction_complete_1_1787881010425.jpg",
        "water_construction_complete_2_1787881042893.jpg"
    ],
    "MPL-2026-00112": [ # Solar
        "solar_street_light.jpg",
        "solar_street_light.jpg",
        "solar_street_light.jpg",
        "solar_street_light.jpg"
    ]
}

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads", "projects")

def seed_images():
    db = SessionLocal()
    
    # First, clear existing seeded images to avoid duplicates if run multiple times
    db.query(ProjectDocument).filter(ProjectDocument.file_name.like("demo_seed_%")).delete(synchronize_session=False)
    db.commit()
    
    for project_id, images in seed_mapping.items():
        project_dir = os.path.join(UPLOAD_DIR, project_id)
        os.makedirs(project_dir, exist_ok=True)
        
        for idx, img_name in enumerate(images):
            src_path = os.path.join(ARTIFACT_DIR, img_name)
            if not os.path.exists(src_path):
                print(f"Skipping {src_path} (Not found)")
                continue
                
            safe_filename = f"{int(time.time())}_demo_seed_{os.path.basename(img_name)}"
            dest_path = os.path.join(project_dir, safe_filename)
            
            shutil.copy2(src_path, dest_path)
            
            file_url = f"/uploads/projects/{project_id}/{safe_filename}"
            
            doc = ProjectDocument(
                project_id=project_id,
                file_name=f"demo_seed_{os.path.basename(img_name)}",
                file_type="IMAGE",
                file_url=file_url,
                uploaded_by="System"
            )
            db.add(doc)
            
        print(f"Seeded images for {project_id}")
    
    db.commit()
    db.close()
    print("Seeding complete.")

if __name__ == "__main__":
    seed_images()

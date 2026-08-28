import os
import shutil
from fastapi import UploadFile
from typing import Tuple

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")

class StorageService:
    @staticmethod
    async def upload_file(file: UploadFile, entity_id: str) -> Tuple[str, str]:
        """
        Uploads a file into a logically structured folder and returns (file_url, file_type).
        In production, this translates cleanly to S3 bucket keys (e.g. s3://bucket/projects/MPL-001/photo.jpg).
        """
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext in ['.pdf']:
            file_type = 'PDF'
        elif file_ext in ['.csv', '.xlsx']:
            file_type = 'CSV'
        elif file_ext in ['.jpg', '.jpeg', '.png', '.webp']:
            file_type = 'IMAGE'
        else:
            file_type = 'OTHER'

        # Determine logical folder structure based on entity_id
        if entity_id == "KNOWLEDGE_BASE":
            sub_dir = "knowledge_base"
        else:
            sub_dir = f"projects/{entity_id}"
            
        target_dir = os.path.join(UPLOAD_DIR, sub_dir)
        os.makedirs(target_dir, exist_ok=True)

        import time
        safe_filename = f"{int(time.time())}_{file.filename}"
        file_path = os.path.join(target_dir, safe_filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Serve static URL mapped to the logical structure
        file_url = f"/uploads/{sub_dir}/{safe_filename}"
        
        return file_url, file_type

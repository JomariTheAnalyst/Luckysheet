from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import pandas as pd
import json
import requests
import os
from dotenv import load_dotenv
import io
from typing import List, Dict, Any, Optional
import logging

# Load environment variables
load_dotenv()

app = FastAPI(title="Smart Sheet AI API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3002"],  # Luckysheet frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Gemini API configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_BASE_URL = os.getenv("GEMINI_BASE_URL")

class AIRequest(BaseModel):
    prompt: str
    context: Optional[str] = None
    sheetData: Optional[List[List[Any]]] = None
    selectedRange: Optional[Dict] = None

class FormulaRequest(BaseModel):
    description: str
    context: str
    sheetData: List[List[Any]]

class DataCleanRequest(BaseModel):
    data: List[List[Any]]
    cleaningType: str  # "remove_nulls", "remove_duplicates", "standardize_text", etc.

class ChartRequest(BaseModel):
    data: List[List[Any]]
    chartType: str  # "bar", "line", "pie"
    xColumn: int
    yColumn: int

async def call_gemini_api(prompt: str, context: str = "") -> str:
    """Call Gemini API with the given prompt"""
    try:
        headers = {
            "Content-Type": "application/json"
        }
        
        data = {
            "contents": [{
                "parts": [{
                    "text": f"{context}\n\n{prompt}" if context else prompt
                }]
            }],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 1000,
            }
        }
        
        response = requests.post(
            f"{GEMINI_BASE_URL}?key={GEMINI_API_KEY}",
            headers=headers,
            json=data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            if 'candidates' in result and len(result['candidates']) > 0:
                return result['candidates'][0]['content']['parts'][0]['text']
            else:
                return "No response generated"
        else:
            logger.error(f"Gemini API error: {response.status_code} - {response.text}")
            return f"Error: {response.status_code}"
    
    except Exception as e:
        logger.error(f"Error calling Gemini API: {str(e)}")
        return f"Error: {str(e)}"

@app.post("/api/ai/query")
async def ai_query(request: AIRequest):
    """Process natural language queries about spreadsheet data"""
    try:
        # Build context from sheet data if provided
        context = ""
        if request.sheetData:
            context += f"Current spreadsheet data (first 5 rows): {request.sheetData[:5]}\n"
        if request.selectedRange:
            context += f"Selected range: {request.selectedRange}\n"
        if request.context:
            context += f"Additional context: {request.context}\n"
        
        # Enhanced prompt for spreadsheet operations
        enhanced_prompt = f"""
You are a Smart Sheet AI assistant. Analyze the user's request and provide actionable spreadsheet operations.

Context: {context}

User Request: {request.prompt}

Please provide a response in the following JSON format:
{{
    "action": "action_type",  // One of: "formula", "format", "chart", "clean_data", "analysis", "general"
    "response": "human_readable_response",
    "data": {{
        // Action-specific data
    }}
}}

For formula requests, include the Excel formula in the data field.
For formatting requests, include style specifications.
For chart requests, include chart configuration.
For data cleaning, specify the cleaning operations needed.
"""

        ai_response = await call_gemini_api(enhanced_prompt)
        
        # Try to parse as JSON, fallback to text response
        try:
            parsed_response = json.loads(ai_response)
            return JSONResponse(content=parsed_response)
        except:
            return JSONResponse(content={
                "action": "general",
                "response": ai_response,
                "data": {}
            })
    
    except Exception as e:
        logger.error(f"Error in AI query: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-formula")
async def generate_formula(request: FormulaRequest):
    """Generate Excel formula based on description"""
    try:
        prompt = f"""
Generate an Excel formula for the following requirement:

Description: {request.description}
Context: {request.context}
Sample Data (first 3 rows): {request.sheetData[:3] if request.sheetData else "No data provided"}

Please provide only the Excel formula (starting with =) that accomplishes this task.
Consider the data structure and provide a formula that can be applied to the appropriate cells.
"""
        
        formula = await call_gemini_api(prompt)
        
        # Clean up the response to extract just the formula
        formula = formula.strip()
        if not formula.startswith('='):
            # Try to extract formula from response
            lines = formula.split('\n')
            for line in lines:
                if line.strip().startswith('='):
                    formula = line.strip()
                    break
        
        return JSONResponse(content={
            "formula": formula,
            "success": True
        })
    
    except Exception as e:
        logger.error(f"Error generating formula: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/clean-data")
async def clean_data(request: DataCleanRequest):
    """Clean spreadsheet data based on the specified cleaning type"""
    try:
        df = pd.DataFrame(request.data)
        
        if request.cleaningType == "remove_nulls":
            df = df.dropna()
        elif request.cleaningType == "remove_duplicates":
            df = df.drop_duplicates()
        elif request.cleaningType == "standardize_text":
            for col in df.select_dtypes(include=['object']):
                df[col] = df[col].astype(str).str.strip().str.title()
        elif request.cleaningType == "remove_empty_rows":
            df = df.dropna(how='all')
        elif request.cleaningType == "remove_empty_columns":
            df = df.dropna(axis=1, how='all')
        
        cleaned_data = df.values.tolist()
        
        return JSONResponse(content={
            "cleanedData": cleaned_data,
            "rowsRemoved": len(request.data) - len(cleaned_data),
            "success": True
        })
    
    except Exception as e:
        logger.error(f"Error cleaning data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-chart")
async def generate_chart(request: ChartRequest):
    """Generate chart configuration for Luckysheet"""
    try:
        df = pd.DataFrame(request.data)
        
        # Extract data for chart
        if request.xColumn < len(df.columns) and request.yColumn < len(df.columns):
            x_data = df.iloc[:, request.xColumn].tolist()
            y_data = df.iloc[:, request.yColumn].tolist()
            
            # Create Luckysheet chart configuration
            chart_config = {
                "chartType": request.chartType,
                "chartOptions": {
                    "chart": {
                        "type": request.chartType
                    },
                    "title": {
                        "text": f"{request.chartType.title()} Chart"
                    },
                    "xAxis": {
                        "categories": x_data if request.chartType != "pie" else None
                    },
                    "yAxis": {
                        "title": {
                            "text": "Values"
                        }
                    } if request.chartType != "pie" else None,
                    "series": [{
                        "name": "Data",
                        "data": y_data if request.chartType != "pie" else [
                            {"name": str(x_data[i]), "y": float(y_data[i])} 
                            for i in range(len(x_data))
                        ]
                    }]
                }
            }
            
            return JSONResponse(content={
                "chartConfig": chart_config,
                "success": True
            })
        else:
            raise ValueError("Invalid column indices")
    
    except Exception as e:
        logger.error(f"Error generating chart: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload-file")
async def upload_file(file: UploadFile = File(...)):
    """Upload and parse CSV/XLSX files"""
    try:
        # Read file content
        content = await file.read()
        
        # Parse based on file extension
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.StringIO(content.decode('utf-8')))
        elif file.filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")
        
        # Convert to list format for Luckysheet
        headers = df.columns.tolist()
        data = [headers] + df.values.tolist()
        
        return JSONResponse(content={
            "data": data,
            "rows": len(data),
            "columns": len(headers),
            "filename": file.filename,
            "success": True
        })
    
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "Smart Sheet AI API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
# BOQ/BOM PDF Generator - Python Service

Professional PDF generation for InvoiceChaser using Python and ReportLab.

## Quick Start

### 1. Install Python Dependencies

```bash
cd python_pdf_service
pip install -r requirements.txt
```

### 2. Start the PDF Service

```bash
python boq_pdf_generator.py
```

The service will start on http://localhost:5000

### 3. Test the Service

```bash
curl http://localhost:5000/health
```

Should return: `{"status": "ok", "service": "BOQ/BOM PDF Generator"}`

## API Endpoints

### Health Check
```
GET /health
```

### Generate BOQ PDF
```
POST /generate-boq
Content-Type: application/json

{
  "discipline": "Civil Engineering",
  "date": "2024-01-15",
  "plan": "Professional",
  "items": [
    {
      "name": "Cement (50kg)",
      "category": "Cement & Concrete",
      "quantity": 50,
      "unit": "bag",
      "price": 11.50,
      "shop": "Buildit Zimbabwe",
      "type": "material"
    }
  ]
}
```

### Generate BOM PDF
```
POST /generate-bom
Content-Type: application/json

{
  "discipline": "Mechanical Engineering",
  "date": "2024-01-15",
  "items": [
    {
      "name": "Steel Rebar 12mm",
      "category": "Steel & Metal",
      "quantity": 100,
      "unit": "m",
      "price": 2.30,
      "shop": "Cashbuild Zimbabwe"
    }
  ]
}
```

## Standalone Script Usage

Generate PDF without running the server:

```bash
# Create JSON file
echo '{
  "discipline": "Civil Engineering",
  "items": [
    {"name": "Cement", "category": "Materials", "quantity": 50, "unit": "bags", "price": 11.50, "shop": "Buildit"}
  ]
}' > boq_data.json

# Generate BOQ PDF
python generate_pdf.py boq boq_data.json output.pdf

# Generate BOM PDF
python generate_pdf.py bom bom_data.json output.pdf
```

## Troubleshooting

### Port 5000 already in use
```bash
# Find and kill process
lsof -ti:5000 | xargs kill -9

# Or use different port
python boq_pdf_generator.py --port 5001
```

### Missing dependencies
```bash
pip install --upgrade -r requirements.txt
```

### CORS errors in browser
The service already includes CORS headers for localhost:3000-3002. If using a different port, edit the CORS line in `boq_pdf_generator.py`.

## Features

- ✅ Professional table formatting with alternating row colors
- ✅ Automatic cost calculations (Material + Labor + Contingency)
- ✅ Shop attribution for each item
- ✅ Summary section with grand total
- ✅ A4 page size optimized for printing
- ✅ Grid layout for easy reading

## Integration with Frontend

The frontend will automatically:
1. Try the Python service first
2. Fall back to jsPDF if Python service is unavailable
3. Show user-friendly error messages

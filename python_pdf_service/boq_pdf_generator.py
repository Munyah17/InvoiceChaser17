#!/usr/bin/env python3
"""
BOQ/BOM PDF Generator - Python Service
Generates professional PDFs for Bills of Quantities and Bills of Materials
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from io import BytesIO
from datetime import datetime
import base64
import tempfile
import os

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"])

def generate_boq_pdf(data):
    """Generate BOQ PDF from data"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20*mm,
        leftMargin=20*mm,
        topMargin=20*mm,
        bottomMargin=20*mm
    )
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#1a1a1a'),
        spaceAfter=6,
        alignment=TA_LEFT
    )
    
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#666666'),
        spaceAfter=20
    )
    
    # Header
    elements.append(Paragraph("Bill of Quantities", title_style))
    
    # Metadata
    discipline = data.get('discipline', 'General')
    generated_date = data.get('date', datetime.now().strftime('%Y-%m-%d'))
    plan = data.get('plan', 'Free')
    
    meta_text = f"""
    <b>Discipline:</b> {discipline}<br/>
    <b>Generated:</b> {generated_date}<br/>
    <b>Plan:</b> {plan}
    """
    elements.append(Paragraph(meta_text, subtitle_style))
    elements.append(Spacer(1, 10))
    
    # Items table
    items = data.get('items', [])
    if items:
        table_data = [['Item', 'Category', 'Qty', 'Unit', 'Price', 'Total', 'Shop']]
        
        material_cost = 0
        labor_cost = 0
        
        for item in items:
            qty = float(item.get('quantity', 0))
            price = float(item.get('price', 0))
            total = qty * price
            
            if item.get('type') == 'labor':
                labor_cost += total
            else:
                material_cost += total
            
            table_data.append([
                item.get('name', ''),
                item.get('category', ''),
                str(qty),
                item.get('unit', ''),
                f"${price:.2f}",
                f"${total:.2f}",
                item.get('shop', 'Other')
            ])
        
        # Create table
        table = Table(table_data, colWidths=[70*mm, 25*mm, 12*mm, 12*mm, 18*mm, 18*mm, 25*mm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a1a1a')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('ALIGN', (2, 1), (5, -1), 'RIGHT'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
        ]))
        
        elements.append(table)
        elements.append(Spacer(1, 20))
        
        # Summary
        total_cost = material_cost + labor_cost
        contingency = total_cost * 0.15
        grand_total = total_cost + contingency
        
        summary_data = [
            ['', ''],
            ['Material Cost:', f"${material_cost:.2f}"],
            ['Labor Cost:', f"${labor_cost:.2f}"],
            ['Subtotal:', f"${total_cost:.2f}"],
            ['Contingency (15%):', f"${contingency:.2f}"],
            ['Grand Total:', f"${grand_total:.2f}"]
        ]
        
        summary_table = Table(summary_data, colWidths=[100*mm, 80*mm])
        summary_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, -1), (-1, -1), 11),
            ('TEXTCOLOR', (0, -1), (-1, -1), colors.HexColor('#1a1a1a')),
            ('LINEABOVE', (0, -1), (-1, -1), 1, colors.black),
            ('TOPPADDING', (0, -1), (-1, -1), 8),
        ]))
        
        elements.append(summary_table)
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    return buffer

def generate_bom_pdf(data):
    """Generate BOM PDF from data"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20*mm,
        leftMargin=20*mm,
        topMargin=20*mm,
        bottomMargin=20*mm
    )
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#1a1a1a'),
        spaceAfter=6,
        alignment=TA_LEFT
    )
    
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#666666'),
        spaceAfter=20
    )
    
    # Header
    elements.append(Paragraph("Bill of Materials", title_style))
    
    # Metadata
    discipline = data.get('discipline', 'General')
    generated_date = data.get('date', datetime.now().strftime('%Y-%m-%d'))
    
    meta_text = f"""
    <b>Discipline:</b> {discipline}<br/>
    <b>Generated:</b> {generated_date}
    """
    elements.append(Paragraph(meta_text, subtitle_style))
    elements.append(Spacer(1, 10))
    
    # Items table
    items = data.get('items', [])
    if items:
        table_data = [['Item', 'Category', 'Qty', 'Unit', 'Price', 'Total', 'Shop']]
        
        grand_total = 0
        
        for item in items:
            qty = float(item.get('quantity', 0))
            price = float(item.get('price', 0))
            total = qty * price
            grand_total += total
            
            table_data.append([
                item.get('name', ''),
                item.get('category', ''),
                str(qty),
                item.get('unit', ''),
                f"${price:.2f}",
                f"${total:.2f}",
                item.get('shop', 'Other')
            ])
        
        # Create table
        table = Table(table_data, colWidths=[70*mm, 25*mm, 12*mm, 12*mm, 18*mm, 18*mm, 25*mm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a1a1a')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('ALIGN', (2, 1), (5, -1), 'RIGHT'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
        ]))
        
        elements.append(table)
        elements.append(Spacer(1, 20))
        
        # Summary
        summary_data = [
            ['', ''],
            ['Grand Total:', f"${grand_total:.2f}"]
        ]
        
        summary_table = Table(summary_data, colWidths=[100*mm, 80*mm])
        summary_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, -1), (-1, -1), 12),
            ('TEXTCOLOR', (0, -1), (-1, -1), colors.HexColor('#1a1a1a')),
            ('LINEABOVE', (0, -1), (-1, -1), 1, colors.black),
            ('TOPPADDING', (0, -1), (-1, -1), 8),
        ]))
        
        elements.append(summary_table)
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    return buffer

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'service': 'BOQ/BOM PDF Generator'})

@app.route('/generate-boq', methods=['POST'])
def generate_boq():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        pdf_buffer = generate_boq_pdf(data)
        
        return send_file(
            pdf_buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f"BOQ_{datetime.now().strftime('%Y-%m-%d')}.pdf"
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/generate-bom', methods=['POST'])
def generate_bom():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        pdf_buffer = generate_bom_pdf(data)
        
        return send_file(
            pdf_buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f"BOM_{datetime.now().strftime('%Y-%m-%d')}.pdf"
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Starting BOQ/BOM PDF Generator Service...")
    print("API endpoints:")
    print("  - GET  /health        - Health check")
    print("  - POST /generate-boq  - Generate BOQ PDF")
    print("  - POST /generate-bom  - Generate BOM PDF")
    print("")
    print("Service running on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)

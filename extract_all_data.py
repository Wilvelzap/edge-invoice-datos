import pandas as pd
import json
import os

def process_excel(file_path):
    df = pd.read_excel(file_path)
    # Basic numeric conversion
    for col in df.columns:
        if df[col].dtype == 'object':
            try:
                # Try to convert to numeric if possible, but keep as string if not
                pass 
            except:
                pass
    return df.to_dict(orient='records')

try:
    edge_path = r'c:\Users\wilve\OneDrive\Escritorio\datos Edge dasboards\Copia de 4 meses - eDGE v2.xlsx'
    invoice_path = r'c:\Users\wilve\OneDrive\Escritorio\datos Edge dasboards\Copia de 4 meses -inv v2.xlsx'
    
    print("Processing EDGE data...")
    edge_data = process_excel(edge_path)
    
    print("Processing INVOICE data...")
    invoice_data = process_excel(invoice_path)
    
    combined_data = {
        "edge": edge_data,
        "invoice": invoice_data
    }
    
    output_js = f"const allProjectsData = {json.dumps(combined_data, default=str)};"
    
    with open('data.js', 'w', encoding='utf-8') as f:
        f.write(output_js)
        
    print(f"Successfully merged data. EDGE: {len(edge_data)} rows, INVOICE: {len(invoice_data)} rows.")

except Exception as e:
    print(f"Error during extraction: {e}")

import pandas as pd
import sys

# Set encoding to utf-8 for output
sys.stdout.reconfigure(encoding='utf-8')

try:
    file_path = r'c:\Users\wilve\OneDrive\Escritorio\datos Edge dasboards\4 meses - eDGE.xlsx'
    # Load the excel file
    df = pd.read_excel(file_path)
    
    print("--- Columns ---")
    for col in df.columns:
        print(col)
        
    print("\n--- Types ---")
    print(df.dtypes)
    
    print("\n--- First 3 Rows ---")
    print(df.head(3).to_string())
    
    print("\n--- Unique Values for potential filters ---")
    # Check for Region or City columns if they exist based on user request (User mentioned 'Region' and 'Ciudad')
    # I'll check all object columns for unique counts to guess which are categorical
    for col in df.select_dtypes(include=['object']).columns:
        unique_vals = df[col].dropna().unique()
        if len(unique_vals) < 50:
            print(f"{col}: {unique_vals}")
        else:
            print(f"{col}: {len(unique_vals)} unique values")

except Exception as e:
    print(f"Error: {e}")

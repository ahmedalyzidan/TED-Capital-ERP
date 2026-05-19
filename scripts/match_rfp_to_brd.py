import os
import sys
import traceback
from difflib import SequenceMatcher
from pathlib import Path

try:
    import pandas as pd
except Exception:
    print("ERROR: pandas is required. Install with: pip install pandas openpyxl python-docx")
    raise

try:
    from docx import Document
except Exception:
    print("ERROR: python-docx is required. Install with: pip install python-docx")
    raise


def extract_rfp_sections(docx_path):
    doc = Document(docx_path)
    sections = []
    for p in doc.paragraphs:
        text = p.text.strip()
        if not text:
            continue
        style_name = ''
        try:
            style_name = p.style.name or ''
        except Exception:
            style_name = ''

        # Heading styles
        if style_name and style_name.lower().startswith('heading'):
            sections.append(text)
            continue

        # Numbered paragraphs detection (numPr present)
        try:
            p_el = p._p
            pPr = getattr(p_el, 'pPr', None)
            if pPr is not None and getattr(pPr, 'numPr', None) is not None:
                sections.append(text)
                continue
        except Exception:
            pass

    # keep unique in order
    seen = set()
    uniq = []
    for s in sections:
        if s not in seen:
            seen.add(s)
            uniq.append(s)
    return uniq


def find_aligned_col(columns):
    for c in columns:
        if c is None:
            continue
        if str(c).strip().lower() == 'aligned brd description':
            return c
    # fallback: find a column containing the phrase
    for c in columns:
        if c is None:
            continue
        if 'aligned' in str(c).lower() and 'brd' in str(c).lower() and 'description' in str(c).lower():
            return c
    return None


def best_match(text, candidates):
    if text is None:
        return None, 0.0
    best = None
    best_score = 0.0
    s1 = str(text)
    for c in candidates:
        score = SequenceMatcher(None, s1, str(c)).ratio()
        if score > best_score:
            best_score = score
            best = c
    return best, best_score


def process(docx_path, excel_path):
    out = []
    try:
        sections = extract_rfp_sections(docx_path)
    except Exception as e:
        raise RuntimeError(f"Failed to read DOCX {docx_path}: {e}")

    if not sections:
        print("Warning: No RFP sections extracted from DOCX.")

    # Read all sheets
    try:
        sheets = pd.read_excel(excel_path, sheet_name=None, dtype=object)
    except Exception as e:
        raise RuntimeError(f"Failed to read Excel {excel_path}: {e}")

    updated_sheets = {}
    changes = []
    total_updates = 0

    for sheet_name, df in sheets.items():
        print(f"Processing sheet: {sheet_name}")
        if df is None:
            print(f" - Sheet {sheet_name} is empty, skipping")
            continue

        # ensure DataFrame has default integer index so Excel row numbers are calculable
        df = df.reset_index(drop=True)

        aligned_col = find_aligned_col(df.columns)
        if aligned_col is None:
            print(f" - No 'Aligned BRD Description' column found in sheet '{sheet_name}', skipping")
            updated_sheets[sheet_name] = df
            continue

        sheet_relevant_flag = 'digital' in sheet_name.lower()

        # iterate rows
        for idx, row in df.iterrows():
            try:
                row_values = row.astype(str).fillna('').values if hasattr(row, 'astype') else [str(x) for x in row]
            except Exception:
                row_values = [str(x) for x in row]

            row_contains_digital = any('digital' in (str(v) or '').lower() for v in row_values)
            relevant = sheet_relevant_flag or row_contains_digital
            if not relevant:
                continue

            old_val = row.get(aligned_col, None)
            if pd.isna(old_val) or (old_val is None) or (str(old_val).strip() == ''):
                continue

            best_sec, score = best_match(old_val, sections)
            if best_sec is None:
                continue

            if score >= 0.25:
                new_val = best_sec
                if str(old_val).strip() != str(new_val).strip():
                    excel_row = int(idx) + 2  # header row is 1 in Excel
                    changes.append({
                        'sheet': sheet_name,
                        'row': excel_row,
                        'column': aligned_col,
                        'old_value': old_val,
                        'new_value': new_val,
                        'match_score': float(score),
                        'matched_section': best_sec,
                    })
                    df.at[idx, aligned_col] = new_val
                    total_updates += 1

        updated_sheets[sheet_name] = df

    # write updated workbook
    base, ext = os.path.splitext(excel_path)
    updated_path = f"{base}_updated{ext}"
    changes_path = f"{base}_changes{ext}"

    try:
        with pd.ExcelWriter(updated_path, engine='openpyxl') as writer:
            for name, df in updated_sheets.items():
                # Pandas may error on empty dataframes with no columns; handle gracefully
                try:
                    df.to_excel(writer, sheet_name=name, index=False)
                except Exception:
                    # fallback: write empty sheet
                    pd.DataFrame().to_excel(writer, sheet_name=name, index=False)

        # write changes
        if changes:
            ch_df = pd.DataFrame(changes)
        else:
            ch_df = pd.DataFrame(columns=['sheet', 'row', 'column', 'old_value', 'new_value', 'match_score', 'matched_section'])

        with pd.ExcelWriter(changes_path, engine='openpyxl') as writer:
            ch_df.to_excel(writer, sheet_name='changes', index=False)

    except Exception as e:
        raise RuntimeError(f"Failed to write output Excel files: {e}")

    summary = {
        'total_sheets': len(sheets),
        'total_updates': total_updates,
        'updated_workbook': updated_path,
        'changes_workbook': changes_path,
    }
    return summary, changes


def main():
    docx_path = r"D:\z\Digital onboarding\AAIB_Business_Digital_Onboarding_RFP_VF 18-05-2026_Backup.docx"
    excel_path = r"D:\z\Digital onboarding\AAIB_Digital_Onboarding_Requirements_Comparison.xlsx"

    try:
        summary, changes = process(docx_path, excel_path)
        print("\nProcessing complete.")
        print(f"Total sheets scanned: {summary['total_sheets']}")
        print(f"Total updates applied: {summary['total_updates']}")
        print(f"Updated workbook written to: {summary['updated_workbook']}")
        print(f"Changes workbook written to: {summary['changes_workbook']}")

        if changes:
            print('\nSample changes (first 20):')
            for c in changes[:20]:
                print(c)
    except Exception as e:
        print('An exception occurred during processing:')
        traceback.print_exc()
        sys.exit(2)


if __name__ == '__main__':
    main()

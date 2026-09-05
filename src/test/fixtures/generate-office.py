"""Reproduce small Office fixtures using only Python's standard library."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
from xml.sax.saxutils import escape

root = Path(__file__).parent

def write(name, entries):
    with ZipFile(root / name, 'w', ZIP_DEFLATED) as archive:
        for path, content in entries.items():
            info = ZipInfo(path, (2020, 1, 1, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            archive.writestr(info, content)

write('preview.docx', {
    '[Content_Types].xml': '''<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>''',
    '_rels/.rels': '''<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>''',
    'word/document.xml': '''<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body><w:p><w:r><w:t>Confidential budget 日本語</w:t></w:r></w:p><w:p><w:hyperlink r:id="bad"><w:r><w:t>Unsafe link</w:t></w:r></w:hyperlink></w:p><w:p><w:r><w:t>&lt;img src="https://example.invalid/leak" onerror="alert(1)"&gt;</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Budget total</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>1200</w:t></w:r></w:p></w:tc></w:tr></w:tbl><w:sectPr/></w:body></w:document>''',
    'word/_rels/document.xml.rels': '''<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="bad" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="javascript:alert(1)" TargetMode="External"/></Relationships>''',
})

ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'

def sheet(rows):
    parts = []
    for row_idx, row in enumerate(rows, 1):
        cells = []
        for col_idx, value in enumerate(row):
            column, n = '', col_idx + 1
            while n:
                n, digit = divmod(n - 1, 26)
                column = chr(65 + digit) + column
            pos = f'{column}{row_idx}' 
            if isinstance(value, int):
                cells.append(f'<c r="{pos}"><v>{value}</v></c>')
            else:
                cells.append(f'<c r="{pos}" t="inlineStr"><is><t>{escape(value)}</t></is></c>')
        parts.append(f'<row r="{row_idx}">{"".join(cells)}</row>')
    return f'<worksheet xmlns="{ns}"><sheetData>{"".join(parts)}</sheetData></worksheet>'

write('preview.xlsx', {
    '[Content_Types].xml': '''<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>''',
    '_rels/.rels': '''<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>''',
    'xl/workbook.xml': f'''<workbook xmlns="{ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Budget" sheetId="1" r:id="r1"/><sheet name="Forecast" sheetId="2" r:id="r2"/><sheet name="Empty" sheetId="3" r:id="r3"/><sheet name="Large" sheetId="4" r:id="r4"/></sheets></workbook>''',
    'xl/_rels/workbook.xml.rels': '''<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="r2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="r3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/><Relationship Id="r4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet4.xml"/></Relationships>''',
    'xl/worksheets/sheet1.xml': sheet([['Item', 'Amount'], ['Budget total', 1200], ['<img src="https://example.invalid/leak" onerror="alert(1)">', 0]]),
    'xl/worksheets/sheet2.xml': sheet([['Quarter', 'Forecast'], ['Q1', 2400]]),
    'xl/worksheets/sheet3.xml': sheet([]),
    'xl/worksheets/sheet4.xml': sheet([[f'Column {i}' for i in range(51)]] + [[i] for i in range(500)]),
})

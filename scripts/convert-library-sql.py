#!/usr/bin/env python3
"""Convert a phpMyAdmin MySQL dump to JSON without executing SQL. UTF-8 only."""
import json,re,sys
from pathlib import Path

def rows(text, table):
    result=[]
    pattern=re.compile(r'INSERT\s+INTO\s+`'+re.escape(table)+r'`\s*\(([^)]+)\)\s*VALUES\s*',re.I)
    for match in pattern.finditer(text):
        columns=re.findall(r'`([^`]+)`',match[1]); i=match.end(); values=[]; row=[]; token=''; quoted=False; wasquoted=False; depth=0
        while i<len(text):
            c=text[i];i+=1
            if quoted:
                if c=='\\':
                    if i>=len(text):raise ValueError('Unfinished escape')
                    c=text[i];i+=1;token+= {'n':'\n','r':'\r','t':'\t','0':'\x00','Z':'\x1a'}.get(c,c)
                elif c=="'":
                    if i<len(text) and text[i]=="'":token+="'";i+=1
                    else:quoted=False
                else:token+=c
                continue
            if c=="'":quoted=True;wasquoted=True;continue
            if c=='(':
                if depth:raise ValueError('Expressions are not supported')
                depth=1;row=[];token='';wasquoted=False;continue
            if c in ',)' and depth:
                value=token if wasquoted else (None if token.strip().upper()=='NULL' else int(token.strip()))
                row.append(value);token='';wasquoted=False
                if c==')':
                    if len(row)!=len(columns):raise ValueError('Column count mismatch')
                    result.append(dict(zip(columns,row)));depth=0
                continue
            if c==';' and not depth:break
            if depth and (wasquoted or not c.isspace()):token+=c
    if len({r['id'] for r in result})!=len(result):raise ValueError('Duplicate IDs in '+table)
    return result

if __name__=='__main__':
    if len(sys.argv)!=3:raise SystemExit('Usage: python3 scripts/convert-library-sql.py legacy.sql library-legacy.json')
    text=Path(sys.argv[1]).read_text(encoding='utf-8-sig')
    data={'format':1,'categories':rows(text,'books_library_structura'),'books':rows(text,'books_library')}
    if not data['categories'] or not data['books']:raise SystemExit('Expected library tables were not found')
    Path(sys.argv[2]).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    print('Categories:',len(data['categories']),'Books:',len(data['books']))

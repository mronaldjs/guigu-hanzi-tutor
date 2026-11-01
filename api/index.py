import os
import sys
import json
import sqlite3
import urllib.request
import urllib.parse
import re
from http.server import BaseHTTPRequestHandler

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Check DB path in parent directory or local
DB_PATH = os.path.abspath(os.path.join(BASE_DIR, '..', 'data', 'cedict.db'))
if not os.path.exists(DB_PATH):
    DB_PATH = os.path.abspath(os.path.join(BASE_DIR, 'data', 'cedict.db'))

def resolve_definitions(defs_str, cur):
    raw_defs = [d.strip() for d in defs_str.split('/') if d.strip()]
    enriched = []
    for d in raw_defs:
        m = re.search(r'(?:variant of|see also|see|also written as|also written)\s+([^\[/\s]+)', d)
        if m:
            target = m.group(1).strip()
            if '|' in target:
                target = target.split('|')[1]
            try:
                cur.execute('SELECT pinyin_tones, definitions FROM cedict WHERE simplified = ? LIMIT 1', (target,))
                t_row = cur.fetchone()
                if t_row:
                    t_pin, t_defs = t_row
                    t_clean = [x.strip() for x in t_defs.split('/') if x.strip() and not x.startswith(('variant of', 'see '))][:2]
                    if t_clean:
                        enriched.append(f"{d} (Significado principal de '{target}' [{t_pin}]: {'; '.join(t_clean)})")
                        continue
            except Exception:
                pass

        if d.startswith('CL:'):
            cl_items = d[3:].split(',')
            cl_names = []
            for item in cl_items:
                item = item.strip()
                if '|' in item:
                    item = item.split('|')[1]
                cl_names.append(item)
            enriched.append(f"Classificador de contagem: {', '.join(cl_names)}")
            continue

        enriched.append(d)
    return enriched

class handler(BaseHTTPRequestHandler):
    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path.endswith('/recognize'):
            self.handle_recognize()
        elif path.endswith('/favorites'):
            self.handle_save_favorite()
        elif path.endswith('/favorites/delete'):
            self.handle_delete_favorite()
        else:
            self.send_json({"error": "Endpoint not found"}, 404)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path.endswith('/lookup'):
            self.handle_lookup(query)
        elif path.endswith('/search'):
            self.handle_search(query)
        elif path.endswith('/xianxia'):
            self.handle_xianxia_list()
        elif path.endswith('/favorites'):
            self.handle_get_favorites()
        elif path.endswith('/favorites/export'):
            self.handle_export_favorites()
        else:
            self.send_json({"status": "Guigu Hanzi Tutor API online"}, 200)

    def handle_recognize(self):
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length == 0:
            self.send_json({"error": "Empty payload"}, 400)
            return

        body = self.rfile.read(content_length).decode('utf-8')
        try:
            req_data = json.loads(body)
            width = req_data.get('width', 400)
            height = req_data.get('height', 400)
            ink = req_data.get('strokes', [])

            google_ink = []
            for stroke in ink:
                xs = [pt[0] for pt in stroke]
                ys = [pt[1] for pt in stroke]
                ts = [pt[2] if len(pt) > 2 else idx * 20 for idx, pt in enumerate(stroke)]
                google_ink.append([xs, ys, ts])

            payload = {
                "options": "enable_pre_space",
                "requests": [{
                    "writing_guide": {
                        "writing_area_width": width,
                        "writing_area_height": height
                    },
                    "ink": google_ink,
                    "language": "zh"
                }]
            }

            g_url = "https://inputtools.google.com/request?ime=handwriting&app=mobilesearch&cs=1&oe=UTF-8"
            req = urllib.request.Request(
                g_url,
                data=json.dumps(payload).encode('utf-8'),
                headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                g_res = json.loads(resp.read().decode('utf-8'))
                candidates = g_res[1][0][1] if len(g_res) > 1 and len(g_res[1]) > 0 and len(g_res[1][0]) > 1 else []

            conn = sqlite3.connect(DB_PATH)
            cur = conn.cursor()
            enriched = []
            for char in candidates[:16]:
                cur.execute('SELECT pinyin_tones, definitions FROM cedict WHERE simplified = ? LIMIT 1', (char,))
                row = cur.fetchone()
                if row:
                    pinyin_tones, defs = row
                    def_summary = defs.split('/')[0] if defs else ''
                    enriched.append({"char": char, "pinyin": pinyin_tones, "summary": def_summary})
                else:
                    enriched.append({"char": char, "pinyin": "", "summary": ""})
            conn.close()

            self.send_json({"success": True, "candidates": enriched})
        except Exception as e:
            self.send_json({"error": str(e), "candidates": []}, 500)

    def handle_lookup(self, query):
        q = query.get('q', [''])[0].strip()
        if not q:
            self.send_json({"error": "Query required"}, 400)
            return

        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()

        cur.execute('''
            SELECT traditional, simplified, pinyin, pinyin_tones, definitions
            FROM cedict
            WHERE simplified = ? OR traditional = ?
        ''', (q, q))
        rows = cur.fetchall()

        entries = []
        for r in rows:
            trad, simp, pin, pin_tones, defs = r
            def_list = resolve_definitions(defs, cur)
            entries.append({
                "traditional": trad,
                "simplified": simp,
                "pinyin_raw": pin,
                "pinyin": pin_tones,
                "definitions": def_list
            })

        cur.execute('''
            SELECT term, pinyin, translation_pt, lore_pt, category
            FROM xianxia_terms
            WHERE term = ? OR term LIKE ?
        ''', (q, f"%{q}%"))
        x_rows = cur.fetchall()
        xianxia_matches = []
        for xr in x_rows:
            xianxia_matches.append({
                "term": xr[0],
                "pinyin": xr[1],
                "translation_pt": xr[2],
                "lore_pt": xr[3],
                "category": xr[4],
                "exact": (xr[0] == q)
            })

        compounds = []
        if len(q) == 1:
            cur.execute('''
                SELECT simplified, pinyin_tones, definitions
                FROM cedict
                WHERE simplified LIKE ? AND char_count BETWEEN 2 AND 4
                ORDER BY char_count ASC
                LIMIT 20
            ''', (f"%{q}%",))
            for cr in cur.fetchall():
                simp, pin_tones, defs = cr
                def_first = defs.split('/')[0] if defs else ''
                compounds.append({
                    "simplified": simp,
                    "pinyin": pin_tones,
                    "definition": def_first
                })

        conn.close()

        self.send_json({
            "query": q,
            "entries": entries,
            "xianxia": xianxia_matches,
            "compounds": compounds
        })

    def handle_search(self, query):
        q = query.get('q', [''])[0].strip()
        if not q:
            self.send_json({"results": []})
            return

        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()

        cur.execute('''
            SELECT simplified, pinyin_tones, definitions
            FROM cedict
            WHERE simplified = ? OR pinyin LIKE ? OR definitions LIKE ?
            ORDER BY char_count ASC
            LIMIT 25
        ''', (q, f"%{q}%", f"%{q}%"))
        
        results = []
        for r in cur.fetchall():
            simp, pin_tones, defs = r
            results.append({
                "simplified": simp,
                "pinyin": pin_tones,
                "definitions": [d.strip() for d in defs.split('/') if d.strip()][:3]
            })

        conn.close()
        self.send_json({"query": q, "results": results})

    def handle_xianxia_list(self):
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute('SELECT term, pinyin, translation_pt, lore_pt, category FROM xianxia_terms ORDER BY category ASC, id ASC')
        terms = []
        for r in cur.fetchall():
            terms.append({
                "term": r[0],
                "pinyin": r[1],
                "translation_pt": r[2],
                "lore_pt": r[3],
                "category": r[4]
            })
        conn.close()
        self.send_json({"terms": terms})

    def handle_get_favorites(self):
        self.send_json({"favorites": [], "count": 0})

    def handle_save_favorite(self):
        self.send_json({"success": True})

    def handle_delete_favorite(self):
        self.send_json({"success": True})

    def handle_export_favorites(self):
        self.send_response(200)
        self.send_header('Content-Type', 'text/tab-separated-values; charset=utf-8')
        self.end_headers()
        self.wfile.write("Caractere\tPinyin\tSignificado\tNotas\n".encode('utf-8'))

import os
import sys
import json
import sqlite3
import urllib.request
import urllib.parse
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, 'static')
DB_PATH = os.path.join(BASE_DIR, 'data', 'cedict.db')
PORT = 8088

def init_db():
    if not os.path.exists(DB_PATH):
        from build_db import build_database
        build_database()

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute('''
        CREATE TABLE IF NOT EXISTS saved_words (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word TEXT UNIQUE,
            pinyin TEXT,
            definition TEXT,
            xianxia_note TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def resolve_definitions(defs_str, cur):
    import re
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

class HanziTutorHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == '/api/recognize':
            self.handle_recognize()
        elif path == '/api/favorites':
            self.handle_save_favorite()
        elif path == '/api/favorites/delete':
            self.handle_delete_favorite()
        else:
            self.send_error(404, "Endpoint not found")

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path == '/api/lookup':
            self.handle_lookup(query)
        elif path == '/api/search':
            self.handle_search(query)
        elif path == '/api/xianxia':
            self.handle_xianxia_list()
        elif path == '/api/favorites':
            self.handle_get_favorites()
        elif path == '/api/favorites/export':
            self.handle_export_favorites()
        else:
            # Serve static files or redirect / to index.html
            if path == '/':
                self.path = '/index.html'
            super().do_GET()

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

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
            
            # Format strokes for Google Input Tools: [ [ [x1, x2, ...], [y1, y2, ...], [t1, t2, ...] ], ... ]
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

            # Enrich candidates with quick pinyin from DB
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
            print("Recognition error:", e)
            self.send_json({"error": str(e), "candidates": []}, 500)

    def handle_lookup(self, query):
        q = query.get('q', [''])[0].strip()
        if not q:
            self.send_json({"error": "Query required"}, 400)
            return

        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()

        # 1. Main entry lookup
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

        # 2. Xianxia terms matching
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

        # 3. Check if saved in favorites
        cur.execute('SELECT id FROM saved_words WHERE word = ?', (q,))
        is_saved = bool(cur.fetchone())

        # 4. Compound words containing this character (limit 20)
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
            "is_saved": is_saved,
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
        cur.execute('SELECT term, pinyin, translation_pt, lore_pt, category FROM xianxia_terms ORDER BY id ASC')
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
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute('''
            SELECT id, word, pinyin, definition, xianxia_note, created_at
            FROM saved_words
            ORDER BY id DESC
        ''')
        favs = []
        for r in cur.fetchall():
            favs.append({
                "id": r[0],
                "word": r[1],
                "pinyin": r[2],
                "definition": r[3],
                "xianxia_note": r[4],
                "created_at": r[5]
            })
        conn.close()
        self.send_json({"favorites": favs, "count": len(favs)})

    def handle_save_favorite(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8')
        try:
            data = json.loads(body)
            word = data.get('word', '').strip()
            pinyin = data.get('pinyin', '').strip()
            definition = data.get('definition', '').strip()
            xianxia_note = data.get('xianxia_note', '').strip()

            if not word:
                self.send_json({"error": "Word required"}, 400)
                return

            conn = sqlite3.connect(DB_PATH)
            cur = conn.cursor()
            cur.execute('''
                INSERT INTO saved_words (word, pinyin, definition, xianxia_note)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(word) DO UPDATE SET
                    pinyin=excluded.pinyin,
                    definition=excluded.definition,
                    xianxia_note=excluded.xianxia_note
            ''', (word, pinyin, definition, xianxia_note))
            conn.commit()
            conn.close()

            self.send_json({"success": True, "word": word})
        except Exception as e:
            self.send_json({"error": str(e)}, 500)

    def handle_delete_favorite(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8')
        try:
            data = json.loads(body)
            word = data.get('word', '').strip()
            if not word:
                self.send_json({"error": "Word required"}, 400)
                return

            conn = sqlite3.connect(DB_PATH)
            cur = conn.cursor()
            cur.execute('DELETE FROM saved_words WHERE word = ?', (word,))
            conn.commit()
            conn.close()

            self.send_json({"success": True, "word": word})
        except Exception as e:
            self.send_json({"error": str(e)}, 500)

    def handle_export_favorites(self):
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute('SELECT word, pinyin, definition, xianxia_note FROM saved_words ORDER BY id ASC')
        rows = cur.fetchall()
        conn.close()

        # CSV format suitable for Anki / Excel: Word\tPinyin\tDefinition\tNotes
        lines = ["Caractere\tPinyin\tSignificado\tNotas Cultivo"]
        for r in rows:
            lines.append(f"{r[0]}\t{r[1]}\t{r[2]}\t{r[3]}")
        
        csv_body = "\n".join(lines).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'text/tab-separated-values; charset=utf-8')
        self.send_header('Content-Disposition', 'attachment; filename="palavras_salvas_hanzi.tsv"')
        self.send_header('Content-Length', str(len(csv_body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(csv_body)

def get_local_ip():
    import socket
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

def run():
    init_db()

    server_address = ('', PORT)
    httpd = ThreadingHTTPServer(server_address, HanziTutorHandler)
    local_ip = get_local_ip()
    print(f"==================================================")
    print(f"  Guigu Hanzi Tutor rodando com sucesso!")
    print(f"  PC Local:           http://localhost:{PORT}")
    print(f"  No Celular (Wi-Fi): http://{local_ip}:{PORT}")
    print(f"==================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor finalizado.")
        httpd.server_close()

if __name__ == '__main__':
    run()

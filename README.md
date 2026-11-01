# Guigu Hanzi Tutor (鬼谷汉字)

Um aplicativo local, moderno e estilizado para **desenhar caracteres chineses a mao livre**, obter reconhecimento inteligente instantaneo, ouvir pronuncia em Mandarim, treinar a ordem correta dos traços e consultar termos de cultivo imortal (*Xianxia* / Tale of Immortal / 鬼谷八荒).

---

## Como Executar

Basta dar um duplo clique no arquivo:
```
start.bat
```
Ou rodar pelo terminal em `D:\hanzi-tutor`:
```bash
python server.py
```
Em seguida, acesse no navegador: **`http://localhost:8088`**

---

## Funcionalidades Principais

1. **Area de Caligrafia Ampla e Responsiva**:
   * Canvas expandido com proporçoes confortaveis para escrita manual com mouse, caneta ou touch.
   * Simulaçao de pincel com tinta chinesa (*Maobi*) e suavizaçao de curvas bezier.
   * Grade tradicional **Mi Zi Ge (米字格)** para guiar as proporçoes do caractere (com botao para alternar).
   * Atalhos de teclado: `Ctrl + Z` para desfazer traço, `Delete` ou `Esc` para limpar a tela.

2. **Reconhecimento Inteligente em Tempo Real**:
   * Barra de candidatos com caracteres mais provaveis e seus pinyins.
   * Tolerante a variaçoes e velocidade de escrita.

3. **Caderno de Vocabulario (Salvar Caracteres & Palavras)**:
   * Botao para salvar qualquer caractere ou termo inspecionado com um clique.
   * Modal com busca e filtro das palavras salvas.
   * Exportaçao em formato TSV pronta para importar no **Anki** ou abrir em planilhas.

4. **Inspetor de Caracteres & Dicionario Completo**:
   * Mais de 125.000 entradas compiladas offline do banco **CC-CEDICT** em SQLite ultrarrapido.
   * Caractere grande com botao de copia instantanea para a area de transferencia.
   * **Pinyin com acentos tonais** (*a, a, a, a*).
   * **Pronuncia em audio nativo** com um clique.
   * Lista de palavras compostas onde aquele caractere aparece (ex: clicar em `最` lista `最近`, `最多`, `最新`, etc.).

5. **Treinamento e Animaçao de Traços (Hanzi Writer)**:
   * **Animar**: Veja como o caractere e escrito traço a traço na ordem correta da caligrafia tradicional.
   * **Treinar**: Modo interativo onde voce desenha em cima do guia e ele valida sua ordem de traços.

6. **Contexto Xianxia & Tale of Immortal (鬼谷八荒)**:
   * Identifica automaticamente se o caractere faz parte de termos de jogo (Reinos como *练气, 筑基, 金丹, 元婴*, tecnicas como *武技, 灵技, 身法, 心法, 神通*, *灵石*, *逆天改命*, *宗门*, etc.).
   * Mostra explicaçao de lore e traduçao pratica para o Portugues.

7. **Glossario Completo 鬼谷八荒**:
   * Modal com barra de filtro para consultar dezenas de termos de cultivo e mecanicas a qualquer momento.

8. **Interface Totalmente Responsiva**:
   * Adaptavel para telas ultrawide, resoluçoes padrao 1080p, modo janela dividida lado a lado com o jogo, tablets e smartphones.

---

## Estrutura do Projeto

```
D:\hanzi-tutor\
├── server.py              # Servidor HTTP local multithread em Python (sem dependencias externas)
├── build_db.py            # Script gerador do banco SQLite com CC-CEDICT e termos Xianxia
├── start.bat              # Inicializador com 1 clique para Windows
├── data\
│   └── cedict.db          # Banco de dados SQLite com 125k+ verbetes indexados
└── static\
    ├── index.html         # Interface moderna com iconografia vetorial SVG
    ├── style.css          # Estilizaçao refinada com breakpoints responsivos
    ├── app.js             # Logica do Canvas, reconhecimento, audio e inspeçao
    └── lib\
        └── hanzi-writer.min.js # Motor de animaçao e validaçao de traços
```

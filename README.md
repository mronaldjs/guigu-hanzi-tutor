# Guigu Hanzi Tutor (鬼谷汉字)

[![Vercel Deployment](https://img.shields.io/badge/Deploy-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com)
[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![SQLite](https://img.shields.io/badge/SQLite-125k+_Entries-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://sqlite.org)
[![PWA Ready](https://img.shields.io/badge/PWA-Mobile_Ready-5A0FC8?style=flat-square&logo=pwa&logoColor=white)](#modo-mobile--pwa)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald?style=flat-square)](LICENSE)

Um tutor interativo, moderno e estilizado para **desenho e reconhecimento de caracteres chineses (*Hanzi*)**, consulta instantânea de pinyin, áudio, ordem dos traços e um glossário completo de termos de cultivo imortal (*Xianxia* / *Tale of Immortal* - 鬼谷八荒).

O projeto foi projetado para funcionar de duas formas:
1. **🌐 Online como Web App / PWA (Vercel ou qualquer servidor web)**: Acessível de qualquer navegador no PC, celular ou tablet.
2. **💻 Localmente no PC (Windows / Linux / Mac)**: Servidor multithread leve em Python sem necessidade de instalar dependências externas (`pip install` zero).

---

## 🚀 Como Usar

### Opção 1: Acessar ou Publicar Online (Vercel)

O repositório já está estruturado com [`vercel.json`](file:///D:/hanzi-tutor/vercel.json) e funções serverless em [`api/index.py`](file:///D:/hanzi-tutor/api/index.py).

#### Deploy em 1 Clique na Vercel:
1. Faça fork ou importe o repositório [`mronaldjs/guigu-hanzi-tutor`](https://github.com/mronaldjs/guigu-hanzi-tutor) no painel da [Vercel](https://vercel.com).
2. A Vercel detectará automaticamente a configuração de Serverless Function em Python e os arquivos estáticos.
3. Clique em **Deploy**. Em menos de 1 minuto seu site estará no ar com link público HTTPS (ex: `https://seu-projeto.vercel.app`).

#### Modo Mobile & PWA:
- Ao abrir o link no navegador do celular (Chrome, Safari ou Samsung Internet), você pode clicar em **"Adicionar à Tela de Início"** para instalar o app como um **PWA** independente com ícone próprio e navegação em tela cheia.

---

### Opção 2: Executar Localmente no seu Computador

Não requer `pip` nem instalação de pacotes externos — utiliza exclusivamente a biblioteca padrão do Python 3 e SQLite embutido:

1. No Windows, basta dar um duplo clique em:
   ```
   start.bat
   ```
   *Ou execute pelo terminal:*
   ```bash
   python server.py
   ```
2. O servidor iniciará em poucos segundos e abrirá automaticamente:
   - **No seu PC**: `http://localhost:8088`
   - **No seu celular (na mesma rede Wi-Fi)**: O terminal exibirá o endereço IP local (ex: `http://192.168.1.X:8088`), permitindo desenhar com os dedos ou caneta touch no celular enquanto joga no computador!

---

## ✨ Funcionalidades Principais

### 1. Área de Caligrafia Dinâmica e Responsiva
- **Canvas HiDPI Adaptativo**: Dimensionamento que se adapta perfeitamente à tela do celular (`min(100%, 310px, 42vh)`) ou monitores de alta resolução sem distorções nem transbordamento.
- **Tinta Chinesa & Curvas Bézier**: Suavização em tempo real que simula traços de pincel tradicional (*Maobi*).
- **Grade 米字格 (Mi Zi Ge)**: Auxílio visual tradicional com linhas diagonais e eixos centrais com botão de alternância.
- **Estética de Pergaminho**: Fundo em papel de arroz (*Xuan Paper*) com selo imperial entalhado em cinábrio vermelho (*朱砂印* "鬼谷").

### 2. Reconhecimento de Escrita Inteligente
- **Google Input Tools API Proxy**: Reconhecimento em tempo real das coordenadas dos traços, tolerante a velocidade e pequenas imperfeições de escrita.
- **Atalhos Rápidos de Teclado**:
  - Teclas **`1` a `9`**: Selecionam instantaneamente o caractere candidato correspondente.
  - **`Ctrl + Z`**: Desfaz o último traço desenhado.
  - **`Delete` / `Esc`**: Limpa o canvas.

### 3. Dicionário Completo CC-CEDICT (125.000+ Entradas)
- Banco de dados SQLite embutido ultraveloz (`cedict.db`), respondendo buscas em 1–3 ms.
- **Resolução Automática de Variantes**: Transforma anotações crípticas do CEDICT (como `variant of 門|门`) trazendo o significado real do termo de destino e explicando classificadores gramaticais (`CL:`).
- **Palavras Compostas**: Exibe termos frequentes formados pelo caractere pesquisado (com um clique para inspecionar).

### 4. Glossário Temático de Cultivo & Xianxia (Tale of Immortal / 鬼谷八荒)
- **200+ Termos Curados** divididos em 7 categorias práticas com filtros em tempo real:
  - 🌿 **Alquimia & Pílulas**: *聚气丹, 筑基丹, 悟道丹, 炼丹炉...*
  - ⚡ **Reinos de Cultivo**: *炼气, 筑基, 结晶, 金丹, 具灵, 元婴, 化神, 悟道, 羽化, 登仙...*
  - ⚔️ **Técnicas & Combate**: *武技, 灵技, 身法, 心法, 神通, 暴击, 闪避, 攻击...*
  - 🏔️ **Seitas & Facções**: *宗门, 宗主, 大长老, 贡献, 俸禄, 正道, 魔道...*
  - 💎 **Itens & Artefatos**: *灵石, 储物戒, 传送符, 魂晶, 法宝...*
  - 📜 **Diálogos & NPCs**: *道友, 前辈, 双修, 结拜, 仇人, 论道...*
  - 🛠️ **Modding & Criação**: *模组, 创意工坊, 奇遇, 逆天改命, 先天先天气运...*

### 5. Modo Detalhes Ampliado (Zoom / Fullscreen)
- Permite expandir qualquer ideograma para um tamanho gigante (até 220px) em uma janela modal focada.
- **Animação de Traços com HanziWriter**: Visualize a ordem correta de cada traço caligráfico.
- **Modo Treino (Quiz)**: Desenhe diretamente por cima do ideograma para praticar a ordem exata.

### 6. Síntese de Voz & Áudio em Mandarim
- Botão de pronúncia nativa com síntese de voz em Mandarim padrão (`zh-CN`), agora com feedback visual pulsante durante a reprodução.

### 7. Caderno de Vocabulário & Exportação para o Anki
- Salve caracteres e termos favoritos com um clique no botão de estrela.
- Sincronização automática entre o banco de dados e o `localStorage` do navegador.
- **Exportação TSV para Anki**: Baixe sua lista de estudos pronta para importar como baralho de cartões no Anki.

### 8. Galeria de Caligrafias & Download de Imagens (PNG)
- **Salvar no Caderno**: Guarde suas caligrafias manuais na galeria pessoal de estudos para acompanhar a evolução dos seus traços.
- **Carregar no Canvas**: Recarregue qualquer desenho salvo anteriormente de volta na área de desenho para continuar escrevendo ou inspecionar novamente.
- **Exportação em Alta Resolução**: Baixe suas caligrafias como imagens PNG elegantes em 600x600, renderizadas com papel de arroz, grade e o selo tradicional em cinábrio (*朱砂印* "鬼谷").

---

## 🛠️ Arquitetura Técnica

```
┌─────────────────────────────────────────────────────────────┐
│                    Navegador / PWA                          │
│   (HTML5 Canvas • Vanilla JS • CSS Glassmorphism • SVG)    │
└──────────────┬──────────────────────────────┬───────────────┘
               │ /api/lookup, /api/glossary   │ /api/recognize
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      Backend Serverless      │ │  Google Input Tools Proxy  │
│       (api/index.py          │ │ (Reconhecimento de traços  │
│      ou server.py local)     │ │   de caligrafia manual)    │
└──────────────┬───────────────┘ └────────────────────────────┘
               │ Consultas SQL (1-2 ms)
               ▼
┌──────────────────────────────┐
│   SQLite: data/cedict.db     │
│   • 125.346 verbetes CEDICT  │
│   • 200 termos Xianxia/Guigu │
└──────────────────────────────┘
```

- **Backend Híbrido**:
  - Na Vercel: Executa como **Serverless Function** Python via `@vercel/python` e `api/index.py`. O arquivo `cedict.db` é empacotado no deploy e lido em modo somente-leitura com latência quase nula.
  - Localmente: Executa como servidor multithread nativo via `server.py` sem nenhuma dependência externa.
- **Zero Frameworks Pesados**: Construído com JavaScript Vanilla e CSS puro para garantir carregamento instantâneo mesmo em redes móveis 3G/4G.

---

## 📁 Estrutura de Arquivos

```
guigu-hanzi-tutor/
├── api/
│   └── index.py               # Handler Serverless Python para Vercel
├── data/
│   └── cedict.db              # Banco de dados SQLite com 125k+ entradas
├── static/
│   ├── index.html             # Interface PWA e estrutura da aplicação
│   ├── style.css              # Design responsivo, glassmorphism e tema Xianxia
│   ├── app.js                 # Lógica de caligrafia, áudio, busca e favoritos
│   ├── manifest.json          # Manifesto para instalação como PWA
│   ├── icon-192.png           # Ícone do aplicativo para Android/iOS
│   ├── icon-512.png           # Ícone de alta resolução
│   └── lib/
│       └── hanzi-writer.min.js# Biblioteca para animação de traços
├── build_db.py                # Script de compilação do banco de dados SQLite
├── server.py                  # Servidor local multithread Python
├── vercel.json                # Configuração de roteamento e deploy na Vercel
├── start.bat                  # Inicializador rápido com 1 clique para Windows
└── README.md                  # Documentação do projeto
```

---

## 📜 Licença e Créditos

- **Licença**: [MIT](LICENSE)
- **Base Dicionário**: [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cedict) (Creative Commons Attribution-Share Alike 4.0).
- **Animações de Traços**: [Hanzi Writer](https://chanind.github.io/hanzi-writer/) por chanind.
- **Inspiração**: O incrível RPG de cultivo imortal *Tale of Immortal* (鬼谷八荒) da Ghost Studio.

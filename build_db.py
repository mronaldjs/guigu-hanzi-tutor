import os
import sys
import gzip
import sqlite3
import urllib.request
import json
import re

DB_PATH = os.path.join(os.path.dirname(__file__), 'data', 'cedict.db')
CEDICT_URL = 'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz'
CEDICT_CACHE = os.path.join(os.path.dirname(__file__), 'data', 'cedict_raw.txt.gz')

TONE_MARKS = {
    'a': ['ā', 'á', 'ǎ', 'à', 'a'],
    'e': ['ē', 'é', 'ě', 'è', 'e'],
    'i': ['ī', 'í', 'ǐ', 'ì', 'i'],
    'o': ['ō', 'ó', 'ǒ', 'ò', 'o'],
    'u': ['ū', 'ú', 'ǔ', 'ù', 'u'],
    'v': ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
    'ü': ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü']
}

def pinyin_num_to_tone(pinyin_str):
    words = pinyin_str.split()
    converted_words = []
    for word in words:
        if not word:
            continue
        tone = word[-1]
        if tone.isdigit() and '1' <= tone <= '5':
            t_idx = int(tone) - 1
            w = word[:-1].lower()
            target_vowel = None
            if 'a' in w: target_vowel = 'a'
            elif 'e' in w: target_vowel = 'e'
            elif 'ou' in w: target_vowel = 'o'
            else:
                for char in reversed(w):
                    if char in TONE_MARKS:
                        target_vowel = char
                        break
            if target_vowel and t_idx < 5:
                w = w.replace(target_vowel, TONE_MARKS[target_vowel][t_idx], 1)
            converted_words.append(w)
        else:
            converted_words.append(word)
    return ' '.join(converted_words)

# Curated Xianxia & Tale of Immortal (鬼谷八荒) lore & terms in Portuguese
XIANXIA_TERMS = [
    ("一", "yī", "Um", "Número 1.", "Chinês Essencial"),
    ("二", "èr", "Dois", "Número 2.", "Chinês Essencial"),
    ("三", "sān", "Três", "Número 3.", "Chinês Essencial"),
    ("四", "sì", "Quatro", "Número 4.", "Chinês Essencial"),
    ("五", "wǔ", "Cinco", "Número 5.", "Chinês Essencial"),
    ("六", "liù", "Seis", "Número 6.", "Chinês Essencial"),
    ("七", "qī", "Sete", "Número 7.", "Chinês Essencial"),
    ("八", "bā", "Oito", "Número 8.", "Chinês Essencial"),
    ("九", "jiǔ", "Nove", "Número 9.", "Chinês Essencial"),
    ("十", "shí", "Dez", "Número 10.", "Chinês Essencial"),
    ("百", "bǎi", "Cem", "Centena (100).", "Chinês Essencial"),
    ("千", "qiān", "Mil", "Milhar (1.000).", "Chinês Essencial"),
    ("万", "wàn", "Dez Mil", "Unidade de dez mil (10.000), base comum para grandes quantias.", "Chinês Essencial"),
    ("你", "nǐ", "Você", "Pronome da segunda pessoa do singular.", "Chinês Essencial"),
    ("我", "wǒ", "Eu", "Pronome da primeira pessoa do singular.", "Chinês Essencial"),
    ("他", "tā", "Ele", "Pronome da terceira pessoa masculina.", "Chinês Essencial"),
    ("她", "tā", "Ela", "Pronome da terceira pessoa feminina.", "Chinês Essencial"),
    ("是", "shì", "Ser / É / Sim", "Verbo de ligação de estado ou afirmação.", "Chinês Essencial"),
    ("不", "bù", "Não", "Partícula de negação.", "Chinês Essencial"),
    ("好", "hǎo", "Bom / Bem / OK", "Adjetivo de qualidade favorável ou concordância.", "Chinês Essencial"),
    ("大", "dà", "Grande", "Grande em tamanho, importância ou escala.", "Chinês Essencial"),
    ("小", "xiǎo", "Pequeno", "De dimensões reduzidas ou jovem.", "Chinês Essencial"),
    ("多", "duō", "Muito / Bastante", "Grande quantidade.", "Chinês Essencial"),
    ("少", "shǎo", "Pouco / Raro", "Pequena quantidade.", "Chinês Essencial"),
    ("有", "yǒu", "Ter / Haver / Existir", "Posse ou existência.", "Chinês Essencial"),
    ("无", "wú", "Não ter / Desprovido", "Ausência de algo (oposto de 有).", "Chinês Essencial"),
    ("功法", "gōng fǎ", "Técnicas / Manuais de Cultivo", "Pergaminhos e tomos que ensinam métodos marciais e mágicos.", "Combate & Técnicas"),
    ("武技", "wǔ jì", "Técnica Marcial", "Ataque físico básico de armas (botão esquerdo).", "Combate & Técnicas"),
    ("灵技", "líng jì", "Técnica Espiritual", "Ataque mágico elemental básico (botão esquerdo).", "Combate & Técnicas"),
    ("绝技", "jué jì", "Habilidade Especial", "Golpe devastador com recarga (botão direito).", "Combate & Técnicas"),
    ("身法", "shēn fǎ", "Técnica de Movimento", "Dash, teletransporte, esquiva ou voo acelerado (Barra de espaço).", "Combate & Técnicas"),
    ("心法", "xīn fǎ", "Técnica Mental", "Passivas que ampliam Atributos vitais e resistências.", "Combate & Técnicas"),
    ("神通", "shén tōng", "Habilidade Suprema (Ultimate)", "Poder cósmico destrutivo ativado após preencher condições.", "Combate & Técnicas"),
    ("念力", "niàn lì", "Poder Mental / Foco", "Capacidade de usar tesouros, farejar anéis alheios e detectar perigos.", "Combate & Técnicas"),
    ("剑", "jiàn", "Espada", "Estilo de combate ágil com lâmina reta, extremamente popular e versátil.", "Combate & Técnicas"),
    ("刀", "dāo", "Sabre / Cutelo", "Estilo de golpes cortantes pesados e habilidades com vampirismo/lifesteal.", "Combate & Técnicas"),
    ("枪", "qiāng", "Lança", "Estilo de penetração e alcance com estocadas contínuas.", "Combate & Técnicas"),
    ("拳", "quán", "Punho", "Estilo corpo a corpo com escudo de energia e acúmulo de força bruta.", "Combate & Técnicas"),
    ("掌", "zhǎng", "Palma", "Ataques de ondas de choque em área média e debuffs.", "Combate & Técnicas"),
    ("指", "zhǐ", "Dedo / Qi Concentrado", "Raios concentrados nas pontas dos dedos e mecânica de estilhaçar espíritos.", "Combate & Técnicas"),
    ("火", "huǒ", "Fogo", "Elemento de queimaduras graduais e explosões de dano massivo.", "Combate & Técnicas"),
    ("水", "shuǐ", "Água", "Elemento de controle, congelamento e recuperação de recursos.", "Combate & Técnicas"),
    ("雷", "léi", "Trovão", "Elemento de ataque em cadeia ultra veloz e acertos críticos.", "Combate & Técnicas"),
    ("风", "fēng", "Vento", "Elemento de mobilidade superior, tornados e invulnerabilidade temporária.", "Combate & Técnicas"),
    ("土", "tǔ", "Terra", "Elemento focado em defesa, golens invocados e durabilidade.", "Combate & Técnicas"),
    ("木", "mù", "Madeira", "Elemento de invocação de espíritos vegetais, venenos e cura.", "Combate & Técnicas"),
    ("剑法", "jiàn fǎ", "Caminho da Espada", "Maestria da espada reta taoísta, ágil e cortante.", "Combate & Técnicas"),
    ("刀法", "dāo fǎ", "Caminho do Sabre", "Maestria do sabre curvo, com foco em golpes pesados e sangramento.", "Combate & Técnicas"),
    ("枪法", "qiāng fǎ", "Caminho da Lança", "Estocadas rápidas com alcance e penetração de armadura.", "Combate & Técnicas"),
    ("拳法", "quán fǎ", "Caminho do Punho", "Combate corpo a corpo que gera escudos de energia duráveis.", "Combate & Técnicas"),
    ("掌法", "zhǎng fǎ", "Caminho da Palma", "Disparo de ondas de choque de longo alcance.", "Combate & Técnicas"),
    ("指法", "zhǐ fǎ", "Caminho do Dedo", "Feixes concentrados e estilhaçamento de Qi.", "Combate & Técnicas"),
    ("火灵根", "huǒ líng gēn", "Raiz Espiritual de Fogo", "Aptidão elemental para queimar e causar explosões.", "Combate & Técnicas"),
    ("水灵根", "shuǐ líng gēn", "Raiz Espiritual de Água", "Aptidão elemental para congelamento e controle de campo.", "Combate & Técnicas"),
    ("雷灵根", "léi líng gēn", "Raiz Espiritual de Trovão", "Aptidão elemental focada em velocidade extrema e acertos críticos.", "Combate & Técnicas"),
    ("风灵根", "fēng líng gēn", "Raiz Espiritual de Vento", "Aptidão elemental para mobilidade, ciclones e esquivas.", "Combate & Técnicas"),
    ("土灵根", "tǔ líng gēn", "Raiz Espiritual de Terra", "Aptidão elemental defensiva com escudos rochosos e invocações.", "Combate & Técnicas"),
    ("木灵根", "mù líng gēn", "Raiz Espiritual de Madeira", "Aptidão elemental para venenos, brotos e cura.", "Combate & Técnicas"),
    ("暴击", "bào jī", "Acerto Crítico", "Chance percentual de disparar um golpe com dano multiplicado.", "Combate & Técnicas"),
    ("伤害", "shāng hài", "Dano", "Quantidade de vida subtraída do alvo.", "Combate & Técnicas"),
    ("护盾", "hù dùn", "Escudo de Proteção", "Barreira de energia que absorve danos antes da barra de vida.", "Combate & Técnicas"),
    ("闪避", "shǎn bì", "Esquiva", "Probabilidade de escapar ileso de um golpe inimigo.", "Combate & Técnicas"),
    ("生命", "shēng mìng", "Vida Máxima (HP)", "Quantidade total de dano que o corpo aguenta antes da derrota.", "Combate & Técnicas"),
    ("灵力", "líng lì", "Energia Espiritual (MP)", "Recurso consumido para disparar técnicas mágicas, esquivas e ultimates.", "Combate & Técnicas"),
    ("攻击", "gōng jī", "Poder de Ataque", "Multiplicador base do dano causado a monstros e inimigos.", "Combate & Técnicas"),
    ("防御", "fáng yù", "Defesa / Armadura", "Reduz o dano recebido de ataques físicos e espirituais.", "Combate & Técnicas"),
    ("移速", "yí sù", "Velocidade de Movimento", "Agilidade com que o personagem se desloca nas arenas e no mapa.", "Combate & Técnicas"),
    ("命中", "mìng zhòng", "Precisão / Taxa de Acerto", "Chance de acertar alvos com esquiva alta.", "Combate & Técnicas"),
    ("吸血", "xī xuè", "Roubo de Vida (Lifesteal)", "Percentual de dano infligido que se converte em cura imediata.", "Combate & Técnicas"),
    ("冷却", "lěng què", "Tempo de Recarga (Cooldown)", "Intervalo de tempo antes de poder reativar uma habilidade.", "Combate & Técnicas"),
    ("真实伤害", "zhēn shí shāng hài", "Dano Verdadeiro", "Dano puro que penetra totalmente defesas e escudos protetores.", "Combate & Técnicas"),
    ("眩晕", "xuàn yūn", "Atordoamento (Stun)", "Incapacita o alvo temporariamente, impedindo qualquer movimento ou ataque.", "Combate & Técnicas"),
    ("冰冻", "bīng dòng", "Congelamento (Freeze)", "Paralisa o inimigo em gelo sólido sob frio extremo.", "Combate & Técnicas"),
    ("中毒", "zhòng dú", "Envenenamento (Poison)", "Perda contínua de vida ao longo do tempo.", "Combate & Técnicas"),
    ("灼烧", "zhuó shāo", "Queimadura (Burn)", "Dano contínuo de fogo elemental que reduz regeneração.", "Combate & Técnicas"),
    ("逃跑", "táo pǎo", "Fugir da Batalha", "Bater em retirada rápida quando a batalha estiver perdida.", "Combate & Técnicas"),
    ("练气", "liàn qì", "Refinamento de Qi", "1º Reino de Cultivo: Absorção inicial do Qi elemental nos meridianos.", "Cultivo & Xianxia"),
    ("筑基", "zhù jī", "Estabelecimento de Fundação", "2º Reino: Construção dos alicerces do Dao e abertura do Dantian.", "Cultivo & Xianxia"),
    ("结晶", "jié jīng", "Cristalização", "3º Reino: Condensação e cristalização do Qi espiritual.", "Cultivo & Xianxia"),
    ("金丹", "jīn dān", "Núcleo Dourado", "4º Reino: Qi forjado em um núcleo dourado puro no Dantian.", "Cultivo & Xianxia"),
    ("具灵", "jù líng", "Origem Espiritual", "5º Reino: O espírito ganha forma consciente e sintoniza-se com a natureza.", "Cultivo & Xianxia"),
    ("元婴", "yuán yīng", "Alma Nascente", "6º Reino: Nascimento do embrião espiritual imortal.", "Cultivo & Xianxia"),
    ("化神", "huà shén", "Transformação Divina", "7º Reino: Fusão da alma com o domínio divino e leis cósmicas.", "Cultivo & Xianxia"),
    ("悟道", "wù dào", "Compreensão do Dao", "8º Reino: Iluminação e domínio das regras fundamentais da existência.", "Cultivo & Xianxia"),
    ("羽化", "yǔ huà", "Ascensão Emplumada", "9º Reino: Transmutação do corpo material em essência imortal pura.", "Cultivo & Xianxia"),
    ("登仙", "dēng xiān", "Ascensão a Imortal", "10º Reino: Ascensão final ao Reino Celestial como Verdadeiro Imortal.", "Cultivo & Xianxia"),
    ("灵石", "líng shí", "Pedras Espirituais", "A moeda comum de troca e energia do mundo imortal.", "Cultivo & Xianxia"),
    ("气运", "qì yùn", "Destino / Sorte Cósmica", "A fortuna cósmica que rege encontros fortuitos e bênçãos.", "Cultivo & Xianxia"),
    ("先天气运", "xiān tiān qì yùn", "Destino Inato", "Traços passivos divinos herdados no nascimento do cultivador.", "Cultivo & Xianxia"),
    ("逆天改命", "nì tiān gǎi mìng", "Mudar o Destino Desafiando os Céus", "Poderes e mutações obtidos ao romper reinos contra a ordem natural.", "Cultivo & Xianxia"),
    ("突破", "tū pò", "Romper / Avanço de Reino", "Superar o limite máximo atual de cultivo e ascender.", "Cultivo & Xianxia"),
    ("瓶颈", "píng jǐng", "Gargalo de Cultivo", "Barreira que impede o progresso até que se use pílulas ou iluminação.", "Cultivo & Xianxia"),
    ("天劫", "tiān jié", "Tribulação Celestial", "Provação severa imposta pelo Céu para testar o cultivador.", "Cultivo & Xianxia"),
    ("雷劫", "léi jié", "Tribulação dos Raios", "Relâmpagos cósmicos que atingem o cultivador durante o avanço.", "Cultivo & Xianxia"),
    ("悟性", "wù xìng", "Compreensão / Sagacidade", "Determina a velocidade e facilidade para aprender (compreender) livros de habilidades.", "Cultivo & Xianxia"),
    ("幸运", "xìng yùn", "Sorte", "Afeta a probabilidade de encontros fortuitos, raridade de tesouros e eventos positivos.", "Cultivo & Xianxia"),
    ("魅力", "mèi lì", "Charme / Aparência", "Influencia o impacto inicial em todos os NPCs (de Terrível a Transcendental / 仙姿).", "Cultivo & Xianxia"),
    ("仙姿", "xiān zī", "Aparência Transcendental / Celestial", "O nível máximo de Charme (900+), fazendo com que quase todos os NPCs se apaixonem ou o respeitem à primeira vista.", "Cultivo & Xianxia"),
    ("寿元", "shòu yuán", "Longevidade", "Tempo de vida restante antes da morte natural do corpo.", "Cultivo & Xianxia"),
    ("丹田", "dān tián", "Dantian (Mar de Qi)", "O reservatório de energia espiritual localizado abaixo do umbigo.", "Cultivo & Xianxia"),
    ("经脉", "jīng mài", "Meridianos", "Canais internos por onde circula o fluxo de Qi espiritual.", "Cultivo & Xianxia"),
    ("飞升", "fēi shēng", "Ascender ao Céu", "O ato de voar rumo aos domínios imortais superiores.", "Cultivo & Xianxia"),
    ("轮回", "lún huí", "Roda de Samsara / Reencarnação", "O ciclo eterno de morte e renascimento dos seres.", "Cultivo & Xianxia"),
    ("渡劫", "dù jié", "Atravessar a Tribulação", "Sobreviver ao teste imposto pelos Céus para ascender de reino imortal.", "Cultivo & Xianxia"),
    ("走火入魔", "zǒu huǒ rù mó", "Desvio de Qi / Enlouquecer no Cultivo", "Colapso espiritual grave quando o fluxo de Qi se descontrola nos meridianos.", "Cultivo & Xianxia"),
    ("闭关", "bì guān", "Retiro Meditativo Fechado", "Isolamento rigoroso em caverna ou sala secreta para cultivo intensivo sem perturbações.", "Cultivo & Xianxia"),
    ("出关", "chū guān", "Concluir o Retiro Meditativo", "Encerrar o período de isolamento com sucesso ou após avançar de nível.", "Cultivo & Xianxia"),
    ("夺舍", "duó shè", "Possessão de Corpo", "Ato proibido de uma alma imortal desalojar a consciência de outro para roubar seu corpo mortal.", "Cultivo & Xianxia"),
    ("顿悟", "dùn wù", "Epifania / Iluminação Súbita", "Compreensão instantânea e transcendental das leis do Dao durante a meditação.", "Cultivo & Xianxia"),
    ("心魔", "xīn mó", "Demônios Interiores", "Ilusões, medos e desejos reprimidos que tentam desviar o cultivador durante avanços.", "Cultivo & Xianxia"),
    ("散修", "sǎn xiū", "Cultivador Independente (Rogue)", "Cultivador solitário sem filiação a nenhuma seita ou clã formal.", "Cultivo & Xianxia"),
    ("炉鼎", "lú dǐng", "Caldeirão Humano", "Cultivador explorado para absorção forçada de energia de cultivo por outro.", "Cultivo & Xianxia"),
    ("功德", "gōng dé", "Mérito Cármico", "Pontos cósmicos positivos gerados por atos justos que abrandam as tribulações.", "Cultivo & Xianxia"),
    ("业障", "yè zhàng", "Carma Negativo / Mácula", "Pecados e assassinatos que atraem calamidades e raios celestiais mais letais.", "Cultivo & Xianxia"),
    ("天道", "tiān dào", "O Dao Celestial", "A vontade cósmica e regras imutáveis que governam o universo.", "Cultivo & Xianxia"),
    ("法宝", "fǎ bǎo", "Artefato Mágico", "Tesouros autônomos com habilidades exclusivas de combate.", "Itens & Alquimia"),
    ("丹药", "dān yào", "Pílula Alquímica", "Comprimido medicinal que cura feridas, amplia atributos ou destrava gargalos.", "Itens & Alquimia"),
    ("炼丹", "liàn dān", "Alquimia / Refino de Pílulas", "O processo de calcinar ervas espirituais em um caldeirão.", "Itens & Alquimia"),
    ("妖兽", "yāo shòu", "Fera Demoníaca", "Criaturas selvagens mutadas por Qi espiritual hostil.", "Itens & Alquimia"),
    ("炼器", "liàn qì", "Forja de Artefatos", "Criação e aprimoramento de armas espirituais e tesouros mágicos.", "Itens & Alquimia"),
    ("药材", "yào cái", "Ervas Medicinais", "Plantas e raízes raras colhidas para alquimia.", "Itens & Alquimia"),
    ("妖丹", "yāo dān", "Núcleo de Monstro", "A esfera de energia interna deixada por bestas poderosas derrotadas.", "Itens & Alquimia"),
    ("符箓", "fú lù", "Talismã Mágico", "Tiras de papel inscritas com runas de ativação instantânea.", "Itens & Alquimia"),
    ("丹炉", "dān lú", "Caldeirão Alquímico", "Recipiente resistente a altas temperaturas espirituais para fazer pílulas.", "Itens & Alquimia"),
    ("储物戒", "chǔ wù jiè", "Anel Espacial", "Anel com dimensão de bolso capaz de carregar toneladas de carga.", "Itens & Alquimia"),
    ("坐骑", "zuò jì", "Montaria Imortal", "Criatura ou espada voadora usada para cruzar grandes distâncias no mapa.", "Itens & Alquimia"),
    ("飞剑", "fēi jiàn", "Espada Voadora", "Arma refinada telecineticamente que corta inimigos à distância ou serve de montaria.", "Itens & Alquimia"),
    ("阵法", "zhèn fǎ", "Formações e Matrizes Rúnicas", "Barreiras místicas traçadas com pedras espirituais para defesa ou aprisionamento.", "Itens & Alquimia"),
    ("傀儡", "kuǐ lěi", "Marionete / Golem Espiritual", "Autômato mágico forjado com madeira e núcleos que luta ao seu comando.", "Itens & Alquimia"),
    ("灵兽", "líng shòu", "Besta Espiritual", "Criatura mágica sintonizada que pode ser domada e treinada.", "Itens & Alquimia"),
    ("神兽", "shén shòu", "Besta Divina", "Seres míticos lendários do folclore chinês (Dragão Celestial, Fênix, Qilin, Tartaruga Negra).", "Itens & Alquimia"),
    ("灵草", "líng cǎo", "Erva Espiritual", "Vegetal raro colhido em montanhas para fabricar pílulas de avanço.", "Itens & Alquimia"),
    ("鼎", "dǐng", "Caldeirão Sagrado Ancestral", "Grande recipiente de bronze com três pés usado em rituais e alquimia imperial.", "Itens & Alquimia"),
    ("储物袋", "chǔ wù dài", "Bolsa Dimensional", "Item básico com feitiço de dobra espacial para carregar mantimentos.", "Itens & Alquimia"),
    ("宗门", "zōng mén", "Seita de Cultivo", "Facção organizada com mestres, bibliotecas e territórios.", "Mundo & Lugares"),
    ("拍卖会", "pāi mài huì", "Casa de Leilões", "Evento bienal onde itens de raridade extrema são leiloados.", "Mundo & Lugares"),
    ("坊市", "fāng shì", "Mercado Urbano", "Área comercial onde mercadores vendem manuais, pílulas e materiais.", "Mundo & Lugares"),
    ("酒馆", "jiǔ guǎn", "Taverna", "Ponto de encontro para relaxar, ouvir rumores e obter missões.", "Mundo & Lugares"),
    ("悬赏榜", "xuán shǎng bǎng", "Mural de Recompensas", "Quadro de caçadas e tarefas da cidade e da seita.", "Mundo & Lugares"),
    ("秘境", "mì jìng", "Reino Secreto / Dungeon", "Espaço dimensional oculto com monstros guardando relíquias.", "Mundo & Lugares"),
    ("遗迹", "yí jì", "Ruínas Antigas", "Restos de seitas ou templos esquecidos cheios de perigos.", "Mundo & Lugares"),
    ("客栈", "kè zhàn", "Pousada / Estalagem", "Local para descansar e recuperar vida, energia e foco.", "Mundo & Lugares"),
    ("洞府", "dòng fǔ", "Caverna Imortal / Moradia", "Residência privada do cultivador equipada para meditação e alquimia.", "Mundo & Lugares"),
    ("传送阵", "chuán sòng zhèn", "Matriz de Teletransporte", "Círculo de runas mágicas que transporta instantaneamente entre cidades.", "Mundo & Lugares"),
    ("门派", "mén pài", "Escola / Clã de Artes Marciais", "Instituição tradicional dedicada a um estilo específico de luta.", "Mundo & Lugares"),
    ("灵脉", "líng mài", "Veio Espiritual", "Concentração natural subterrânea de onde brota Qi puro.", "Mundo & Lugares"),
    ("采集", "cǎi jí", "Coletar / Colher", "Ato de colher ervas, raízes ou flores raras pelo mapa.", "Mundo & Lugares"),
    ("背包", "bèi bāo", "Inventário / Mochila", "Espaço onde seus itens, ouro e manuais ficam guardados.", "RPG & Interface"),
    ("人物", "rén wù", "Personagem", "Painel de status, atributos, maestrias e afinidades.", "RPG & Interface"),
    ("任务", "rèn wu", "Missão / Tarefa", "Objetivo com recompensas de pedras espirituais ou reputação.", "RPG & Interface"),
    ("装备", "zhuāng bèi", "Equipamento", "Armaduras, artefatos, montarias e anéis vestidos.", "RPG & Interface"),
    ("属性", "shǔ xìng", "Atributos / Stats", "Valores de Vida, Ataque, Defesa, Sorte e Maestrias.", "RPG & Interface"),
    ("地图", "dì tú", "Mapa do Mundo", "Visão geral das regiões, cidades, seitas e reinos secretos.", "RPG & Interface"),
    ("确认", "què rèn", "Confirmar / OK", "Botão de aceitar ou prosseguir.", "RPG & Interface"),
    ("取消", "qǔ xiāo", "Cancelar", "Botão de voltar ou desistir da ação.", "RPG & Interface"),
    ("购买", "gòu mǎi", "Comprar", "Pagar pedras espirituais por uma mercadoria.", "RPG & Interface"),
    ("出售", "chū shòu", "Vender", "Trocar itens do inventário por moeda.", "RPG & Interface"),
    ("保存", "bǎo cún", "Salvar Jogo", "Gravar o estado atual do progresso.", "RPG & Interface"),
    ("退出", "tuì chū", "Sair", "Fechar ou voltar ao menu inicial.", "RPG & Interface"),
    ("排序", "pái xù", "Ordenar / Classificação", "Critério de organização da lista (ex: mais populares, mais inscritos).", "RPG & Interface"),
    ("筛选", "shāi xuǎn", "Filtrar / Filtro", "Selecionar elementos por critérios ou categorias específicas.", "RPG & Interface"),
    ("热门", "rè mén", "Popular / Em Alta", "Itens ou modificações com grande volume de acessos e atividade recente.", "RPG & Interface"),
    ("订阅", "dìng yuè", "Inscrever-se / Assinar", "Baixar e sincronizar mods ou conteúdos da Oficina Steam.", "RPG & Interface"),
    ("创建", "chuàng jiàn", "Criar / Criação", "Iniciar a criação de um novo personagem, savegame ou mod.", "RPG & Interface"),
    ("更新", "gēng xīn", "Atualizar / Atualização", "Versão renovada de arquivos, pacotes ou conteúdos do jogo.", "RPG & Interface"),
    ("模组", "mó zǔ", "Mod / Modificação", "Pacote de modificação criado pela comunidade para o jogo.", "RPG & Interface"),
    ("启用", "qǐ yòng", "Ativar / Habilitar", "Ligar um mod, habilidade ou configuração.", "RPG & Interface"),
    ("禁用", "jìn yòng", "Desativar / Desabilitar", "Desligar um mod ou opção sem desinstalá-lo.", "RPG & Interface"),
    ("重置", "chóng zhì", "Redefinir / Resetar", "Restaurar atributos ou opções ao estado padrão original.", "RPG & Interface"),
    ("兼容", "jiān róng", "Compatível / Compatibilidade", "Capacidade de diferentes mods ou sistemas rodarem sem falhas juntos.", "RPG & Interface"),
    ("冲突", "chōng tū", "Conflito / Incompatibilidade", "Erro gerado quando duas modificações tentam alterar os mesmos dados.", "RPG & Interface"),
    ("宗主", "zōng zhǔ", "Líder da Seita / Patriarca", "A autoridade máxima de uma organização.", "Social & Relações"),
    ("大长老", "dà zhǎng lǎo", "Grande Ancião", "O ancião mais experiente e poderoso da seita.", "Social & Relações"),
    ("长老", "zhǎng lǎo", "Ancião", "Veterano de alta posição encarregado do ensino e gestão.", "Social & Relações"),
    ("真传弟子", "zhēn chuán dì zǐ", "Discípulo Legítimo", "Discípulo de elite que recebe a herança direta dos anciãos da seita.", "Social & Relações"),
    ("内门弟子", "nèi mén dì zǐ", "Discípulo Interno", "Membro pleno da seita com acesso a recursos superiores.", "Social & Relações"),
    ("外门弟子", "wài mén dì zǐ", "Discípulo Externo", "Iniciante que realiza tarefas cotidianas para tentar subir na hierarquia.", "Social & Relações"),
    ("道侣", "dào lǚ", "Companheiro(a) de Dao", "Parceiro amoroso no caminho imortal.", "Social & Relações"),
    ("双修", "shuāng xiū", "Cultivo Duplo", "Prática meditativa conjunta para acelerar a acumulação de Qi.", "Social & Relações"),
    ("好感度", "hǎo gǎn dù", "Afinidade / Afeição", "Nível de amizade e confiança que um NPC tem por você.", "Social & Relações"),
    ("仇人", "chóu rén", "Inimigo Mortal", "Indivíduo com rancor assassino registrado contra seu nome.", "Social & Relações"),
    ("道号", "dào hào", "Nome Taoísta / Título", "O codinome honorífico de prestígio no mundo imortal.", "Social & Relações"),
    ("弟子", "dì zǐ", "Discípulo", "Estudante ou aprendiz sob tutela de mestres da seita.", "Social & Relações"),
    ("拜师", "bài shī", "Fazer Juramento de Aprendiz", "Ato formal de reverenciar alguém como seu mestre espiritual.", "Social & Relações"),
    ("结义", "jié yì", "Pacto de Irmandade de Sangue", "Tornar-se irmão jurado com outro cultivador.", "Social & Relações"),
    ("赠送", "zèng sòng", "Presentear", "Oferecer pílulas, manuais ou tesouros para elevar a afeição de um NPC.", "Social & Relações"),
    ("论道", "lùn dào", "Debater o Dao", "Conversa filosófica entre cultivadores para trocar percepções do universo.", "Social & Relações"),
    ("闲聊", "xián liáo", "Bate-papo Casual", "Conversar informalmente para descobrir interesses de um NPC.", "Social & Relações"),
    ("击败", "jī bài", "Derrotar", "Vencer um oponente em combate sem necessariamente tirar-lhe a vida.", "Social & Relações"),
    ("击杀", "jī shā", "Eliminar / Abater", "Matar o inimigo em definitivo no campo de batalha.", "Social & Relações"),
    ("偷窃", "tōu qiè", "Furtar / Bater Carteira", "Usar foco mental (念力) para subtrair itens do anel de outros cultivadores.", "Social & Relações"),
    ("勒索", "lè suǒ", "Extorquir / Ameaçar", "Exigir pedras espirituais ou tesouros sob ameaça de agressão.", "Social & Relações"),
    ("报仇", "bào chóu", "Vingar-se", "Retribuir uma afronta ou morte causada por um inimigo registrado.", "Social & Relações"),
    ("求饶", "qiú ráo", "Implorar Misericórdia", "Suplicar para não ser morto após uma derrota em duelo.", "Social & Relações"),
    ("饶命", "ráo mìng", "Poupar a Vida", "Frase usada em desespero: Poupe minha vida!", "Social & Relações"),
    ("前辈", "qián bèi", "Sênior / Veterano", "Forma respeitosa de se dirigir a um cultivador de reino ou idade superior.", "Social & Relações"),
    ("道友", "dào yǒu", "Companheiro Taoísta", "Tratamento cordial entre cultivadores de nível semelhante.", "Social & Relações"),
    ("晚辈", "wǎn bèi", "Júnior / Aprendiz", "Tratamento humilde que um cultivador usa ao falar com mestres experientes.", "Social & Relações"),
    ("告辞", "gào cí", "Despedir-se / Tomar Licença", "Expressão formal para encerrar um diálogo e partir.", "Social & Relações"),
    ("后会有期", "hòu huì yǒu qī", "Até Nosso Próximo Encontro!", "Fórmula clássica de despedida no cultivo imortal.", "Social & Relações"),
]

def build_database():
    print("--- Inicializando criação do Banco de Dados ---")
    if not os.path.exists(CEDICT_CACHE):
        print(f"Baixando CC-CEDICT de {CEDICT_URL}...")
        try:
            req = urllib.request.Request(CEDICT_URL, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as resp, open(CEDICT_CACHE, 'wb') as f:
                f.write(resp.read())
            print(f"Arquivo salvo em {CEDICT_CACHE} ({os.path.getsize(CEDICT_CACHE)} bytes)")
        except Exception as e:
            print(f"Erro ao baixar CC-CEDICT: {e}")
            return False

    print("Descompactando e lendo CC-CEDICT...")
    with gzip.open(CEDICT_CACHE, 'rt', encoding='utf-8') as f:
        lines = f.readlines()

    print(f"Total de linhas brutas: {len(lines)}")
    
    # Conexão SQLite
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute('''
        CREATE TABLE cedict (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            traditional TEXT,
            simplified TEXT,
            pinyin TEXT,
            pinyin_tones TEXT,
            definitions TEXT,
            char_count INTEGER
        )
    ''')
    cur.execute('CREATE INDEX idx_simplified ON cedict(simplified)')
    cur.execute('CREATE INDEX idx_traditional ON cedict(traditional)')
    cur.execute('CREATE INDEX idx_char_count ON cedict(char_count)')

    cur.execute('''
        CREATE TABLE xianxia_terms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            term TEXT UNIQUE,
            pinyin TEXT,
            translation_pt TEXT,
            lore_pt TEXT,
            category TEXT
        )
    ''')
    cur.execute('CREATE INDEX idx_xianxia_term ON xianxia_terms(term)')

    print("Inserindo termos Xianxia em Português...")
    for t in XIANXIA_TERMS:
        cur.execute('''
            INSERT OR REPLACE INTO xianxia_terms (term, pinyin, translation_pt, lore_pt, category)
            VALUES (?, ?, ?, ?, ?)
        ''', t)

    print("Processando CC-CEDICT para SQLite...")
    cedict_rows = []
    # Formato do CEDICT: Tradicional Simplificado [pin1 yin1] /definição 1/definição 2/
    pattern = re.compile(r'^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+/(.+)/$')
    
    for line in lines:
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        m = pattern.match(line)
        if m:
            trad, simp, pin, defs = m.groups()
            pin_tones = pinyin_num_to_tone(pin)
            cedict_rows.append((trad, simp, pin, pin_tones, defs, len(simp)))

    print(f"Inserindo {len(cedict_rows)} entradas do dicionário no SQLite...")
    cur.executemany('''
        INSERT INTO cedict (traditional, simplified, pinyin, pinyin_tones, definitions, char_count)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', cedict_rows)

    conn.commit()
    conn.close()
    print(f"Sucesso! Banco criado em {DB_PATH} ({os.path.getsize(DB_PATH) // (1024*1024)} MB)")
    return True

if __name__ == '__main__':
    build_database()

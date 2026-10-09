/**
 * SGME - Núcleo Compartilhado Frontend
 * Arquivo: shared.js (Versão 5.1 - Instalação/substituição e fluxo de filas - Fotos reduzidas no aparelho antes do envio + visualizador de anexos)
 */

const IS_GITHUB_PAGES = window.location.hostname.includes('github.io');
let servidorBaseUrl = "";
let usuarioLogado = null;

// Lista oficial dos 184 municípios cearenses em caixa alta
const MUNICIPIOS_CE = [
    "ABAIARA","ACARAPE","ACARAÚ","ACOPIARA","AIUABA","ALCÂNTARAS","ALTANEIRA","ALTO SANTO","AMONTADA",
    "ANTONINA DO NORTE","APUIARÉS","AQUIRAZ","ARACATI","ARACOIABA","ARARENDÁ","ARARIPE","ARATUBA","ARNEIROZ",
    "ASSARÉ","AURORA","BAIXIO","BANABUIÚ","BARBALHA","BARREIRA","BARRO","BARROQUINHA","BATURITÉ","BEBERIBE",
    "BELA CRUZ","BOA VIAGEM","BREJO SANTO","CAMOCIM","CAMPOS SALES","CANINDÉ","CAPISTRANO","CARIDADE","CARIRÉ",
    "CARIRIAÇU","CARIÚS","CARNAUBAL","CASCAVEL","CATARINA","CATUNDA","CAUCAIA","CEDRO","CHAVAL","CHORÓ",
    "CHOROVOZINHO","COREAÚ","CRATEÚS","CRATO","CROATÁ","CRUZ","DEPUTADO IRAPUAN PINHEIRO","ERERÊ","EUSÉBIO",
    "FARIAS BRITO","FORQUILHA","FORTALEZA","FORTIM","FRECHEIRINHA","GENERAL SAMPAIO","GRAÇA","GRANJA",
    "GRANJEIRO","GROAÍRAS","GUAIÚBA","GUARACIABA DO NORTE","GUARAMIRANGA","HIDROLÂNDIA","HORIZONTE","IBARETAMA",
    "IBIAPINA","IBICUITINGA","ICAPUÍ","ICÓ","IGUATU","INDEPENDÊNCIA","IPAPORANGA","IPAUMIRIM","IPU","IPUEIRAS",
    "IRACEMA","IRAUÇUBA","ITAIÇABA","ITAITINGA","ITAPAJÉ","ITAPIPOCA","ITAPIÚNA","ITAREMA","ITATIRA","JAGUARETAMA",
    "JAGUARIBARA","JAGUARIBE","JAGUARUANA","JARDIM","JATI","JIJOCA DE JERICOACOARA","JUAZEIRO DO NORTE","JUCÁS",
    "LAVRAS DA MANGABEIRA","LIMOEIRO DO NORTE","MADALENA","MARACANAÚ","MARANGUAPE","MARCO","MARTINÓPOLE","MASSAPÊ",
    "MAURITI","MERUOCA","MILAGRES","MILHÃ","MIRAÍMA","MISSÃO VELHA","MOMBAÇA","MONSENHOR TABOSA","MORADA NOVA",
    "MORAÚJO","MORRINHOS","MUCAMBO","MULUNGU","NOVA OLINDA","NOVA RUSSAS","NOVO ORIENTE","OCARA","ORÓS","PACAJUS",
    "PACATUBA","PACOTI","PACUJÁ","PALHANO","PALMÁCIA","PARACURU","PARAIPABA","PARAMBU","PARAMOTI","PEDRA BRANCA",
    "PENAFORTE","PENTECOSTE","PEREIRO","PINDORETAMA","PIQUET CARNEIRO","PIRES FERREIRA","PORANGA","PORTEIRAS",
    "POTENGI","POTIRETAMA","QUITERIANÓPOLIS","QUIXADÁ","QUIXELÔ","QUIXERAMOBIM","QUIXERÉ","REDENÇÃO","RERIUTABA",
    "RUSSAS","SABOEIRO","SALITRE","SANTA QUITÉRIA","SANTANA DO ACARAÚ","SANTANA DO CARIRI","SÃO BENEDITO",
    "SÃO GONÇALO DO AMARANTE","SÃO JOÃO DO JAGUARIBE","SÃO LUÍS DO CURU","SENADOR POMPEU","SENADOR SÁ","SOBRAL",
    "SOLONÓPOLE","TABULEIRO DO NORTE","TAMBORIL","TARRAFAS","TAUÁ","TEJUÇUOCA","TIANGUÁ","TRAIRI","TURURU",
    "UBAJARA","UMARI","UMIRIM","URUBURETAMA","URUOCA","VARJOTA","VÁRZEA ALEGRE","VIÇOSA DO CEARÁ"
];

// Sanitização estrita contra XSS
function esc(str) {
    return str ? String(str).replace(/[&<>'"]/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[m])) : '';
}

// Formatação oficial do identificador da O.S.: OS_XXXX.MM.AAAA (ex: OS_0017.09.2026)
function formatarNumOS(id, timestamp) {
    if (!id) return '';
    const d = timestamp ? new Date(timestamp) : new Date();
    const seq = String(id).padStart(4, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const aaaa = d.getFullYear();
    return `OS_${seq}.${mm}.${aaaa}`;
}

// Formatação amigável de data e hora
function dataFormatada(timestamp) {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString('pt-BR');
}

// Utilitários de interface
function fecharModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
}

function fazerLogout() {
    localStorage.removeItem('os_usuario_logado');
    sessionStorage.clear();
    window.location.href = 'index.html';
}

function getApiUrl(ep) {
    return `${servidorBaseUrl}${ep}`;
}

// Inicialização central de segurança de sessão e resolução de URL do Cloudflare
async function inicializarCore(perfilEsperado) {
    const raw = localStorage.getItem('os_usuario_logado');
    if (!raw) { 
        window.location.href = 'index.html'; 
        return null; 
    }
    
    usuarioLogado = JSON.parse(raw);
    if (!usuarioLogado || !usuarioLogado.token || (perfilEsperado && usuarioLogado.perfil !== perfilEsperado)) {
        window.location.href = 'index.html';
        return null;
    }

    const nomeDisp = document.getElementById('usuarioNomeDisplay');
    if (nomeDisp) nomeDisp.textContent = esc(usuarioLogado.nome);

    if (IS_GITHUB_PAGES) {
        try {
            const res = await fetch(`servidor.json?t=${Date.now()}`);
            const data = await res.json();
            if (data && data.url) {
                servidorBaseUrl = data.url.replace(/\/+$/, '');
            }
        } catch (err) {
            console.error("Falha ao resolver servidor.json:", err);
        }
    }
    return usuarioLogado;
}

// Cliente HTTP com Bearer Token e suporte automático a JSON e FormData
async function apiFetch(endpoint, options = {}) {
    if (!options.headers) options.headers = {};
    if (usuarioLogado && usuarioLogado.token) {
        options.headers['Authorization'] = `Bearer ${usuarioLogado.token}`;
    }
    
    if (!(options.body instanceof FormData) && !options.headers['Content-Type']) {
        options.headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(getApiUrl(endpoint), options);
    if (res.status === 401) {
        alert("Sessão expirada. Faça login novamente.");
        fazerLogout();
        throw new Error("401 Unauthorized");
    }
    return res;
}

// Emissão e download direto do PDF no padrão oficial OS_XXXX.MM.AAAA.pdf (sem expor Cloudflare ou Token)
async function imprimirOSPdf(os_id, data_abertura = null) {
    if (!usuarioLogado || !usuarioLogado.token) {
        alert("Usuário não autenticado.");
        return;
    }

    try {
        // 1. Baixa o binário do PDF via AJAX seguro com o token no header
        const res = await apiFetch(`/api/os/${os_id}/pdf`);
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.erro || "Falha ao gerar o documento PDF.");
        }

        // 2. Recupera o nome oficial enviado pelo backend (ex: OS_0017.09.2026.pdf) ou gera pelo formatador
        let nomeArquivo = res.headers.get('X-Filename');
        if (!nomeArquivo) {
            nomeArquivo = `${formatarNumOS(os_id, data_abertura)}.pdf`;
        }

        // 3. Converte a resposta em um Blob local do navegador
        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);

        // 4. Dispara o download com o nome padronizado
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = nomeArquivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // 5. Libera a memória alocada
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 30000);

    } catch (err) {
        alert("Erro ao obter PDF: " + err.message);
    }
}

// ---- Fotos: reduz no próprio aparelho ANTES do envio (celular -> Raspberry pela internet) -----------
// Foto de 8 MB vira ~300 KB (lado maior 1600 px, JPEG 80%). PDF e qualquer falha: devolve o arquivo original.
async function otimizarImagemCliente(arquivo, ladoMax = 1600, qualidade = 0.8) {
    try {
        if (!arquivo || !/^image\//i.test(arquivo.type || '')) return arquivo;
        let imagem;
        if (window.createImageBitmap) {
            try { imagem = await createImageBitmap(arquivo, { imageOrientation: 'from-image' }); }
            catch (e) { imagem = await createImageBitmap(arquivo); }
        } else {
            imagem = await new Promise((ok, erro) => {
                const url = URL.createObjectURL(arquivo);
                const el = new Image();
                el.onload = () => { URL.revokeObjectURL(url); ok(el); };
                el.onerror = () => { URL.revokeObjectURL(url); erro(new Error('imagem ilegível')); };
                el.src = url;
            });
        }
        const larg = imagem.width, alt = imagem.height;
        const escala = Math.min(1, ladoMax / Math.max(larg, alt));
        const w = Math.max(1, Math.round(larg * escala)), h = Math.max(1, Math.round(alt * escala));
        const tela = document.createElement('canvas');
        tela.width = w; tela.height = h;
        const ctx = tela.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(imagem, 0, 0, w, h);
        if (imagem.close) imagem.close();
        const blob = await new Promise(ok => tela.toBlob(ok, 'image/jpeg', qualidade));
        if (!blob || (blob.size >= arquivo.size && /jpe?g/i.test(arquivo.type))) return arquivo;
        const base = (arquivo.name || 'foto').replace(/\.[^.]+$/, '');
        return new File([blob], base + '.jpg', { type: 'image/jpeg' });
    } catch (e) {
        return arquivo;   // em qualquer problema, envia o original (o servidor também otimiza)
    }
}

// ---- Anexos (folha assinada) -------------------------------------------------
// Busca o arquivo com o token no header e exibe SEM abrir nova aba. Mostra aviso de carregamento com
// progresso (o arquivo vem do Raspberry pela internet e pode demorar) e erro visível se falhar/estourar o tempo.
function avisoAnexo(texto) {
    let el = document.getElementById('avisoAnexo');
    if (!texto) { if (el) el.remove(); return; }
    if (!el) {
        el = document.createElement('div');
        el.id = 'avisoAnexo';
        el.style.cssText = 'position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:100001;background:#0f172a;color:#fff;padding:12px 18px;border-radius:8px;font:bold 14px sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.35);';
        document.body.appendChild(el);
    }
    el.textContent = texto;
}

async function abrirAnexo(nomeArquivo) {
    const ctl = new AbortController();
    const limite = setTimeout(() => ctl.abort(), 90000);
    avisoAnexo('⏳ Carregando anexo...');
    try {
        const res = await apiFetch('/api/uploads/' + encodeURIComponent(nomeArquivo), { signal: ctl.signal });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.erro || ('Servidor respondeu HTTP ' + res.status));
        }
        const tipo = (res.headers.get('Content-Type') || '').toLowerCase();
        const total = parseInt(res.headers.get('Content-Length') || '0', 10);
        let blob;
        if (res.body && res.body.getReader) {
            const leitor = res.body.getReader();
            const partes = [];
            let recebido = 0;
            for (;;) {
                const { done, value } = await leitor.read();
                if (done) break;
                partes.push(value);
                recebido += value.length;
                avisoAnexo('⏳ Carregando anexo... ' + (total ? Math.min(99, Math.round(recebido * 100 / total)) + '%' : Math.round(recebido / 1024) + ' KB'));
            }
            blob = new Blob(partes, { type: tipo });
        } else {
            blob = await res.blob();
        }
        const blobUrl = window.URL.createObjectURL(blob);
        const movel = /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent);

        if (tipo.startsWith('image/') || (tipo.startsWith('application/pdf') && !movel)) {
            mostrarVisualizadorAnexo(blobUrl, nomeArquivo, tipo);
        } else {
            baixarBlob(blobUrl, nomeArquivo);
            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 30000);
        }
    } catch (err) {
        const msg = err.name === 'AbortError' ? 'Tempo esgotado (90 s). Verifique a conexão e tente novamente.' : err.message;
        alert('Erro ao abrir anexo: ' + msg);
    } finally {
        clearTimeout(limite);
        avisoAnexo(null);
    }
}

function baixarBlob(blobUrl, nomeArquivo) {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function mostrarVisualizadorAnexo(blobUrl, nomeArquivo, tipo) {
    const antigo = document.getElementById('visualizadorAnexo');
    if (antigo) antigo.remove();

    const fundo = document.createElement('div');
    fundo.id = 'visualizadorAnexo';
    fundo.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.9);display:flex;flex-direction:column;';

    const barra = document.createElement('div');
    barra.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;align-items:center;padding:10px 14px;flex:0 0 auto;';
    const dica = document.createElement('span');
    dica.style.cssText = 'color:#cbd5e1;font:12px sans-serif;margin-right:auto;';
    dica.textContent = tipo.startsWith('image/') ? 'Toque na imagem para ampliar/reduzir' : '';
    const estiloBtn = 'border:0;border-radius:6px;padding:9px 14px;font:bold 13px sans-serif;cursor:pointer;text-decoration:none;';
    const baixar = document.createElement('button');
    baixar.type = 'button';
    baixar.textContent = '⬇ Baixar';
    baixar.style.cssText = estiloBtn + 'background:#10b981;color:#fff;';
    baixar.onclick = () => baixarBlob(blobUrl, nomeArquivo);
    const fechar = document.createElement('button');
    fechar.type = 'button';
    fechar.textContent = '✕ Fechar';
    fechar.style.cssText = estiloBtn + 'background:#e2e8f0;color:#0f172a;';
    barra.append(dica, baixar, fechar);

    const area = document.createElement('div');
    area.style.cssText = 'flex:1 1 auto;overflow:auto;display:flex;padding:0 10px 10px;min-height:0;';

    if (tipo.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = blobUrl;
        img.alt = 'Folha assinada';
        const ajustada = 'max-width:100%;max-height:100%;margin:auto;object-fit:contain;cursor:zoom-in;background:#fff;';
        const ampliada = 'max-width:none;margin:0 auto auto;cursor:zoom-out;background:#fff;';
        img.style.cssText = ajustada;
        let zoom = false;
        img.onclick = () => { zoom = !zoom; img.style.cssText = zoom ? ampliada : ajustada; };
        area.appendChild(img);
    } else {
        const quadro = document.createElement('iframe');
        quadro.src = blobUrl;
        quadro.style.cssText = 'flex:1;border:0;background:#fff;';
        area.appendChild(quadro);
    }

    const encerrar = () => {
        document.removeEventListener('keydown', aoTeclar);
        fundo.remove();
        window.URL.revokeObjectURL(blobUrl);
    };
    const aoTeclar = (e) => { if (e.key === 'Escape') encerrar(); };
    fechar.onclick = encerrar;
    document.addEventListener('keydown', aoTeclar);

    fundo.append(barra, area);
    document.body.appendChild(fundo);
}

// SGME 5.0 - utilitários para O.S. de instalação/substituição
function rotuloTipoOS(tipo) {
    return tipo === 'instalacao' ? 'INSTALAÇÃO' : (tipo === 'substituicao' ? 'SUBSTITUIÇÃO' : 'MANUTENÇÃO');
}
function seloTipoOS(tipo) {
    const cor = tipo === 'instalacao' ? '#059669' : (tipo === 'substituicao' ? '#7c3aed' : '#2563eb');
    return `<span class="badge" style="background:${cor};color:#fff;margin-right:4px;">${rotuloTipoOS(tipo)}</span>`;
}
function descricaoEquipamentoOS(os) {
    const marca = os.marca ? `${esc(os.marca)} ` : '';
    return `${marca}${esc(os.tipo_equipamento || '')} ${esc(os.capacidade || '')} (Tombo: ${esc(os.tombo || 'S/T')})`;
}
function linksAnexosOS(os) {
    const itens = [
        ['Folha assinada', os.arquivo_conclusao],
        ['Foto da evaporadora', os.foto_evaporadora],
        ['Foto da condensadora', os.foto_condensadora]
    ].filter(x => x[1]);
    return itens.map(([r,n]) => `<a href="#" onclick="event.preventDefault();abrirAnexo('${esc(n)}');return false;" style="background:#10b981;color:#fff;padding:7px 10px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:12px;display:inline-block;margin:3px;">📎 ${r}</a>`).join('');
}
async function enviarArquivoSGME(arquivo, rotulo) {
    if (!arquivo) throw new Error(`${rotulo}: selecione um arquivo.`);
    const fd = new FormData(); fd.append('file', await otimizarImagemCliente(arquivo));
    const r = await apiFetch('/api/upload', { method:'POST', body:fd });
    const d = await r.json(); if (!r.ok) throw new Error(`${rotulo}: ${d.erro || 'falha no envio'}`);
    return d.arquivo;
}

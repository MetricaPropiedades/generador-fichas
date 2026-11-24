/* ── Fichas guardadas (común a tasadores y fondo de comercio) ──
   Cada PDF que se descarga se sube solo a Google Drive (carpeta "Fichas Métrica (generador)", una subcarpeta por
   herramienta) a través del programita de Google de fichas-guardadas/Codigo-Google.gs. Misma dirección = reemplaza
   la anterior. El botón "Guardadas" lista las de esta herramienta y las abre para seguir editando (el PDF trae los
   datos adentro). El generador de fichas tiene su propia copia de esto (ficha-locales.html), con la misma URL y clave.

   Sirve para PDF y también para la presentación (.html, con mime 'text/html').
   Uso en una herramienta:
     Guardadas.iniciar({ tipos:{tasacion:'Tasación'}, titulo:'Tasaciones', ponerBotonDespuesDe: elemento,
                         abrir: async blob => {...} });
     Guardadas.subir(bytes, {tipo, operacion, id, titulo, nombre});   // después de descargar el PDF          */
(function () {
  const URL_GS = 'https://script.google.com/a/macros/metricapropiedades.com/s/AKfycby4ha7YHxkRJ63WcXEfn2P_yW4dCmkUQdHIOkppPcUW4xWJUtF1w_3IDnBNYAUQ8Cbg/exec';
  const CLAVE = 'metrica-fichas-2026';
  let cfg = {}, lista = [], modal, toast, toastTimer;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /* dirección normalizada: "Av. Cabildo 2302" y "avenida cabildo 2302" son la misma */
  const claveDir = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\bavenida\b/g, 'av').replace(/\bav\./g, 'av').replace(/\bcalle\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();

  async function llamar(q) {
    const r = await fetch(URL_GS, { method: 'POST', body: JSON.stringify({ ...q, clave: CLAVE }) });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || 'Error del servidor');
    return j;
  }
  const aBase64 = bytes => new Promise((ok, mal) => {
    const fr = new FileReader();
    fr.onload = () => ok(String(fr.result).split(',')[1]); fr.onerror = mal;
    fr.readAsDataURL(new Blob([bytes]));
  });

  const CSS = `
#gdx-modal{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99998;display:flex;align-items:center;justify-content:center;padding:16px;font-family:'Inter','Barlow',system-ui,sans-serif;}
#gdx-modal[hidden]{display:none;}
.gdx-box{background:#1e1e1e;border:1px solid rgba(255,255,255,.12);border-radius:8px;width:min(720px,100%);max-height:88vh;display:flex;flex-direction:column;}
.gdx-hd{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.12);}
.gdx-hd h2{font-family:'Big Shoulders Display',sans-serif;font-size:20px;font-weight:800;color:#fff;flex:1;letter-spacing:.02em;margin:0;}
.gdx-hd h2 span{color:#C8941A;}
.gdx-busca{margin:12px 16px 8px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:4px;color:#fff;font-size:14px;padding:9px 10px;font-family:inherit;}
.gdx-busca:focus{outline:none;border-color:#C8941A;}
.gdx-lista{overflow-y:auto;padding:0 16px 14px;display:flex;flex-direction:column;gap:6px;}
.gdx-item{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:6px;padding:10px 12px;}
.gdx-info{flex:1;min-width:0;}
.gdx-tit{color:#fff;font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.gdx-meta{color:rgba(255,255,255,.45);font-size:11px;margin-top:2px;}
.gdx-chip{display:inline-block;background:rgba(200,148,26,.15);color:#C8941A;font-size:10px;font-weight:700;padding:1px 6px;border-radius:3px;margin-right:6px;text-transform:uppercase;letter-spacing:.04em;}
.gdx-b{font-family:inherit;font-size:12px;font-weight:700;padding:8px 12px;border-radius:4px;cursor:pointer;white-space:nowrap;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#fff;}
.gdx-b:hover{border-color:#C8941A;}
.gdx-b.prim{background:#C8941A;border-color:#C8941A;color:#1a1a1a;}
.gdx-b.x{color:#e57373;padding:8px 10px;}
.gdx-b:disabled{opacity:.5;cursor:default;}
.gdx-vacio{color:rgba(255,255,255,.45);font-size:13px;text-align:center;padding:28px 10px;line-height:1.6;}
.gdx-abrir{display:flex;align-items:center;gap:10px;width:100%;margin-top:8px;padding:10px 12px;background:rgba(200,148,26,.1);border:1px solid rgba(200,148,26,.55);border-radius:6px;color:#fff;cursor:pointer;text-align:left;font-family:inherit;box-sizing:border-box;}
.gdx-abrir:hover{background:rgba(200,148,26,.18);border-color:#C8941A;}
.gdx-abrir .ico{font-size:20px;line-height:1;}
.gdx-abrir b{display:block;font-size:13px;color:#C8941A;}
.gdx-abrir small{display:block;font-size:10px;color:rgba(255,255,255,.55);margin-top:2px;}
.gdx-abrir .fl{margin-left:auto;font-size:22px;color:#C8941A;line-height:1;}
#gdx-toast{position:fixed;left:16px;bottom:16px;z-index:99999;max-width:min(420px,calc(100vw - 32px));background:#2B2B2B;color:#fff;border-left:4px solid #C8941A;border-radius:6px;padding:10px 14px;font:600 13px/1.4 'Inter','Barlow',system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.3);cursor:pointer;}
#gdx-toast.mal{border-left-color:#e57373;}
#gdx-toast[hidden]{display:none;}
@media(max-width:820px){.gdx-item{flex-wrap:wrap;}.gdx-info{flex-basis:100%;}.gdx-item .gdx-b{flex:1;min-height:44px;font-size:14px;}}
@media print{#gdx-modal,#gdx-toast{display:none!important;}}`;

  function aviso(txt, mal) {
    toast.textContent = txt; toast.className = mal ? 'mal' : ''; toast.hidden = false;
    clearTimeout(toastTimer);
    if (!mal) toastTimer = setTimeout(() => { toast.hidden = true; }, 7000);
  }

  function pintar() {
    const q = claveDir(modal.querySelector('.gdx-busca').value);
    const fs = lista.filter(f => cfg.tipos[f.tipo] && (!q || claveDir(f.titulo).includes(q)));
    const cont = modal.querySelector('.gdx-lista');
    if (!fs.length) {
      cont.innerHTML = '<div class="gdx-vacio">' + (lista.some(f => cfg.tipos[f.tipo]) ? 'No hay nada con esa búsqueda.'
        : 'Todavía no hay nada guardado acá.<br>Se guarda solo cada vez que alguien descarga.') + '</div>';
      return;
    }
    cont.innerHTML = fs.map(f => {
      const d = new Date(f.fecha);
      const fecha = d.toLocaleDateString('es-AR') + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
      return '<div class="gdx-item"><div class="gdx-info"><div class="gdx-tit">' + esc(f.titulo || f.nombre) + '</div>' +
        '<div class="gdx-meta"><span class="gdx-chip">' + esc(cfg.tipos[f.tipo]) + (f.operacion ? ' · ' + esc(f.operacion) : '') + '</span>' + fecha + '</div></div>' +
        '<button class="gdx-b prim" data-gd="editar" data-id="' + esc(f.id) + '">Editar</button>' +
        '<button class="gdx-b" data-gd="bajar" data-id="' + esc(f.id) + '">Descargar</button>' +
        '<button class="gdx-b x" data-gd="borrar" data-id="' + esc(f.id) + '" title="Quitar de Guardadas">✕</button></div>';
    }).join('');
  }

  async function abrirLista() {
    modal.hidden = false;
    const cont = modal.querySelector('.gdx-lista');
    cont.innerHTML = '<div class="gdx-vacio">Cargando…</div>';
    try { lista = (await llamar({ accion: 'listar' })).fichas || []; pintar(); }
    catch (e) { cont.innerHTML = '<div class="gdx-vacio">No se pudo cargar la lista (' + esc(e.message) + '). Revisá la conexión y probá de nuevo.</div>'; }
  }

  async function clicLista(ev) {
    const b = ev.target.closest('[data-gd]'); if (!b) return;
    const f = lista.find(x => x.id === b.dataset.id); if (!f) return;
    if (b.dataset.gd === 'borrar') {
      if (!confirm('¿Quitar "' + (f.titulo || f.nombre) + '" de Guardadas? (va a la papelera de Drive)')) return;
      b.disabled = true;
      try { await llamar({ accion: 'borrar', id: f.id }); lista = lista.filter(x => x !== f); pintar(); }
      catch (e) { alert('No se pudo quitar: ' + e.message); b.disabled = false; }
      return;
    }
    if (b.dataset.gd === 'editar' && !confirm('Se va a reemplazar lo que tenés ahora en pantalla por esta. ¿Seguir?')) return;
    const txt = b.textContent; b.disabled = true; b.textContent = 'Abriendo…';
    try {
      const j = await llamar({ accion: 'abrir', id: f.id });
      const blob = new Blob([Uint8Array.from(atob(j.pdf), c => c.charCodeAt(0))], { type: /\.html?$/i.test(j.nombre || f.nombre || '') ? 'text/html' : 'application/pdf' });
      if (b.dataset.gd === 'editar') { await cfg.abrir(blob); modal.hidden = true; }
      else {
        const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: j.nombre || f.nombre });
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }
    } catch (e) { alert('No se pudo abrir: ' + e.message); }
    b.disabled = false; b.textContent = txt;
  }

  window.Guardadas = {
    claveDir,
    abrirLista: () => abrirLista(),
    iniciar(c) {
      cfg = c;
      const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
      modal = document.createElement('div'); modal.id = 'gdx-modal'; modal.hidden = true;
      modal.innerHTML = '<div class="gdx-box" role="dialog" aria-label="Guardadas"><div class="gdx-hd"><h2>' + esc(c.titulo) +
        ' <span>guardadas</span></h2><button class="gdx-b" data-cerrar>Cerrar</button></div>' +
        '<input class="gdx-busca" type="search" placeholder="Buscar por dirección…"><div class="gdx-lista"></div></div>';
      modal.addEventListener('click', ev => { if (ev.target === modal || ev.target.closest('[data-cerrar]')) modal.hidden = true; });
      modal.querySelector('.gdx-busca').addEventListener('input', pintar);
      modal.querySelector('.gdx-lista').addEventListener('click', clicLista);
      document.addEventListener('keydown', ev => { if (ev.key === 'Escape') modal.hidden = true; });
      document.body.appendChild(modal);
      toast = document.createElement('div'); toast.id = 'gdx-toast'; toast.hidden = true;
      toast.addEventListener('click', () => { toast.hidden = true; });
      document.body.appendChild(toast);
      if (c.ponerBotonDespuesDe) {
        const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'gdx-abrir';
        btn.innerHTML = '<span class="ico">🗂</span><span><b>' + esc(c.titulo) + ' guardadas</b><small>Las de todo el equipo · se guardan solas al descargar</small></span><span class="fl">›</span>';
        btn.addEventListener('click', abrirLista);
        c.ponerBotonDespuesDe.insertAdjacentElement('afterend', btn);
      }
    },
    /* después de descargar el PDF: sube una copia (sin preguntar). Si no hay dirección, no se guarda. */
    async subir(bytes, d) {
      if (!d.id || !d.titulo) return;
      aviso('Guardando copia en Guardadas…');
      try {
        const j = await llamar({ accion: 'guardar', tipo: d.tipo, operacion: d.operacion || '', id: d.id, titulo: d.titulo, nombre: d.nombre, mime: d.mime || 'application/pdf', pdf: await aBase64(bytes) });
        const h = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
        aviso((j.reemplazada ? '✓ Actualizada en Guardadas · ' : '✓ Agregada a Guardadas · ') + h);
      } catch (e) {
        console.warn('No se pudo guardar la copia', e);
        aviso('⚠ No se pudo guardar la copia en Guardadas (el PDF sí se descargó). Tocá para cerrar.', true);
      }
    }
  };
})();

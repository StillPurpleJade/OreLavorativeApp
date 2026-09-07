// --- Navigazione tab ---
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.page').forEach(s => s.hidden = true);
    document.getElementById(btn.dataset.tab).hidden = false;
    if (btn.dataset.tab === 'riepilogo') aggiornaRiepilogo();
  });
});

// --- Dipendenti ---
const dipBody = document.getElementById('dip-body');
const btnAggiungi = document.getElementById('btn-aggiungi');
const selettoreOrdinamento = document.getElementById('selettore-ordinamento');
const btnSalvaOrdine = document.getElementById('btn-salva-ordine');
const selettoreGiorno = document.getElementById('selettore-giorno');
const btnAggiungiTuttiGiorni = document.getElementById('btn-aggiungi-tutti-giorni');
const agendaBody = document.getElementById('agenda-body');
const agendaSelettoreOrdinamento = document.getElementById('agenda-selettore-ordinamento');
const agendaBtnSalvaOrdine = document.getElementById('agenda-btn-salva-ordine');
const agendaSelettoreData = document.getElementById('agenda-selettore-data');
const agendaDataVisibile = document.getElementById('agenda-data-visibile');
const riepilogoMese = document.getElementById('riepilogo-mese');
const riepilogoMeseVisibile = document.getElementById('riepilogo-mese-visibile');
const riepilogoMesePrecedente = document.getElementById('riepilogo-mese-precedente');
const riepilogoMeseSuccessivo = document.getElementById('riepilogo-mese-successivo');
const riepilogoHead = document.getElementById('riepilogo-head');
const riepilogoBody = document.getElementById('riepilogo-body');
const STORAGE_KEY = 'ore-lavoro-dipendenti';
const ORDER_KEY = 'ore-lavoro-ordinamento';
const CUSTOM_ORDER_KEY = 'ore-lavoro-ordine-personalizzato';
const DAY_KEY = 'ore-lavoro-giorno';
const AGENDA_DATE_KEY = 'ore-lavoro-data-agenda';
let prossimoId = 1;
let ordinePersonalizzato = [];

function dataDaMese(mese, giorno) {
  return `${mese}-${String(giorno).padStart(2, '0')}`;
}

function minutiAgenda(row, data) {
  const turni = getTurniAgenda(row, data);
  const giorno = getGiornoSettimana(data);
  const base = row._dati.giorni[giorno] || row._dati.turni;
  const assenze = row._dati.assenze[data] || {};
  return turni.reduce((totale, turno, indice) => {
    if (assenze[indice]) return totale - getMinutiTurni(base.slice(indice, indice + 1));
    return totale + getMinutiTurni([turno]) - getMinutiTurni(base.slice(indice, indice + 1));
  }, 0);
}

function formattaDifferenza(minuti) {
  if (minuti === 0) return '';
  const segno = minuti > 0 ? '+' : '-';
  return `${segno}${formattaDurata(Math.abs(minuti))}`;
}

function aggiornaMeseRiepilogoVisibile() {
  const [anno, mese] = riepilogoMese.value.split('-');
  riepilogoMeseVisibile.value = anno && mese ? `${mese} ${anno}` : '';
}

function aggiornaRiepilogo() {
  if (!riepilogoMese || !riepilogoMese.value) return;
  aggiornaMeseRiepilogoVisibile();
  const [anno, mese] = riepilogoMese.value.split('-').map(Number);
  const giorniNelMese = new Date(anno, mese, 0).getDate();
  riepilogoHead.innerHTML = '';
  riepilogoBody.innerHTML = '';

  const intestazione = document.createElement('tr');
  const nomeHeader = document.createElement('th');
  nomeHeader.textContent = 'DIPENDENTE';
  nomeHeader.className = 'riepilogo-nome-fisso';
  intestazione.appendChild(nomeHeader);
  for (let giorno = 1; giorno <= giorniNelMese; giorno += 1) {
    const th = document.createElement('th');
    th.textContent = String(giorno);
    intestazione.appendChild(th);
  }
  const totaleHeader = document.createElement('th');
  totaleHeader.textContent = 'TOTALE';
  totaleHeader.className = 'riepilogo-totale-fisso';
  intestazione.appendChild(totaleHeader);
  riepilogoHead.appendChild(intestazione);

  dipBody.querySelectorAll('.dip-row').forEach(row => {
    const tr = document.createElement('tr');
    const nome = document.createElement('td');
    nome.textContent = row._dati.nome || 'Nome...';
    nome.className = 'riepilogo-nome-fisso';
    tr.appendChild(nome);
    let totale = 0;
    for (let giorno = 1; giorno <= giorniNelMese; giorno += 1) {
      const data = dataDaMese(riepilogoMese.value, giorno);
      const minuti = minutiAgenda(row, data);
      totale += minuti;
      const td = document.createElement('td');
      td.textContent = minuti === 0 ? '' : `${minuti > 0 ? '+' : ''}${minuti}`;
      const assenze = row._dati.assenze[data];
      if (assenze && Object.keys(assenze).length > 0) {
        td.className = 'totale-assenza';
      }
      tr.appendChild(td);
    }
    const totaleCell = document.createElement('td');
    totaleCell.textContent = formattaDifferenza(totale);
    totaleCell.className = 'riepilogo-totale-fisso';
    tr.appendChild(totaleCell);
    riepilogoBody.appendChild(tr);
  });
}

// Calcola ore da "HH:MM" a minuti
function parseOra(str) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(str);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  return h * 60 + m;
}

function leggiTurni(row) {
  return [...row.querySelectorAll('.turno')].map(turno => {
    const inputs = turno.querySelectorAll('input');
    return { inizio: inputs[0].value, fine: inputs[1].value };
  });
}

function haOrari(turni) {
  return turni.some(turno => parseOra(turno.inizio) !== null && parseOra(turno.fine) !== null);
}

function aggiornaDatiRiga(row) {
  const turni = leggiTurni(row);
  if (!row._dati.inizializzato && haOrari(turni)) {
    row._dati.turni = turni;
    row._dati.inizializzato = true;
  } else if (row._dati.inizializzato) {
    row._dati.giorni[selettoreGiorno.value] = turni;
    sincronizzaTurniAgenda(row);
  }
  salvaDipendenti();
}

function copiaTurni(turni) {
  return turni.map(turno => ({ inizio: turno.inizio || '', fine: turno.fine || '' }));
}

function sincronizzaTurniAgenda(row) {
  Object.keys(row._dati.agenda).forEach(data => {
    const giorno = getGiornoSettimana(data);
    const base = row._dati.giorni[giorno] || row._dati.turni;
    const agendaTurni = row._dati.agenda[data];
    if (agendaTurni.length < base.length) {
      row._dati.agenda[data] = [
        ...agendaTurni,
        ...copiaTurni(base.slice(agendaTurni.length))
      ];
    }
  });
}

function aggiungiOrarioATuttiIGiorni() {
  if (!window.confirm('Sei sicuro di voler applicare questo orario a tutti i giorni della settimana?')) return;
  dipBody.querySelectorAll('.dip-row').forEach(row => {
    const turni = leggiTurni(row);
    row._dati.turni = copiaTurni(turni);
    row._dati.giorni = {};
    sincronizzaTurniAgenda(row);
  });
  aggiornaGiorno();
}

// Calcola differenza in minuti
function calcolaTotTurno(inputInizio, inputFine) {
  const inizio = parseOra(inputInizio.value);
  const fine = parseOra(inputFine.value);
  if (inizio === null || fine === null || fine === inizio) return 0;

  return fine < inizio ? fine + 24 * 60 - inizio : fine - inizio;
}

function aggiornaGiorno() {
  const giorno = selettoreGiorno.value;
  dipBody.querySelectorAll('.dip-row').forEach(row => {
    const turni = row._dati.giorni[giorno] || row._dati.turni;
    const tdOrari = row.querySelector('.cell-orari');
    const btnTurno = tdOrari.querySelector('.btn-add-turno');
    tdOrari.querySelectorAll('.turno').forEach(turno => turno.remove());
    turni.forEach((turno, indice) => tdOrari.insertBefore(creaTurno(row, turno, indice > 0), btnTurno));
    aggiornaTotali(row);
    const modificabile = row.dataset.modifica === 'true';
    tdOrari.querySelectorAll('input').forEach(input => {
      input.disabled = !modificabile;
    });
  });
  localStorage.setItem(DAY_KEY, giorno);
  salvaDipendenti();
}

function formattaDurata(minuti) {
  if (minuti <= 0) return '';
  const ore = Math.floor(minuti / 60);
  const minutiRimanenti = String(minuti % 60).padStart(2, '0');
  return `${ore}:${minutiRimanenti}`;
}

function formattaInputOra(input) {
  let cifre = input.value.replace(/\D/g, '').slice(0, 5);
  if (cifre.length === 2 && Number(cifre) > 23) {
    input.value = `0${cifre[0]}:${cifre[1]}`;
    return;
  }
  if (cifre.length >= 4 && Number(cifre.slice(0, 2)) > 23) {
    cifre = `0${cifre.slice(0, 3)}`;
  }
  if (cifre.length >= 4) {
    let ore = Number(cifre.slice(0, 2));
    const minuti = Number(cifre.slice(2));
    if (minuti > 59) {
      ore = (ore + Math.floor(minuti / 60)) % 24;
      cifre = `${String(ore).padStart(2, '0')}${String(minuti % 60).padStart(2, '0')}`;
    }
  }
  input.value = cifre.length > 2 ? `${cifre.slice(0, 2)}:${cifre.slice(2)}` : cifre;
}

function gestisciSpazioOra(input, evento) {
  if (evento.key !== ' ') return;

  const cifre = input.value.replace(/\D/g, '');
  if (cifre.length === 0 || cifre.length > 2) return;

  evento.preventDefault();
  input.value = `${cifre.padStart(2, '0')}:`;
  input.setSelectionRange(input.value.length, input.value.length);
}

// Aggiorna tutti i totali di una riga
function aggiornaTotali(row) {
  const turni = row.querySelectorAll('.turno');
  const totCell = row.querySelector('.totali-valori');
  totCell.innerHTML = '';

  turni.forEach(turno => {
    const inputs = turno.querySelectorAll('input');
    const minuti = calcolaTotTurno(inputs[0], inputs[1]);
    const span = document.createElement('span');
    span.className = 'tot-valore';
    span.textContent = formattaDurata(minuti);
    totCell.appendChild(span);
  });
}

function getMinutiInizio(row) {
  return leggiTurni(row)
    .map(turno => parseOra(turno.inizio))
    .filter(minuti => minuti !== null)
    .sort((a, b) => a - b)[0] ?? Number.MAX_SAFE_INTEGER;
}

function getTotaleMinuti(row) {
  return leggiTurni(row).reduce((totale, turno) => {
    const inizio = parseOra(turno.inizio);
    const fine = parseOra(turno.fine);
    if (inizio === null || fine === null || inizio === fine) return totale;
    return totale + (fine < inizio ? fine + 24 * 60 - inizio : fine - inizio);
  }, 0);
}

function getGiornoSettimana(data) {
  const giorno = new Date(`${data}T12:00:00`).getDay();
  return ['domenica', 'lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato'][giorno];
}

function getDataAgenda() {
  return agendaSelettoreData.value;
}

function formattaDataAgenda(data) {
  const [anno, mese, giorno] = data.split('-');
  return `${giorno}/${mese}/${anno}`;
}

function aggiornaDataAgendaVisibile() {
  agendaDataVisibile.value = agendaSelettoreData.value
    ? formattaDataAgenda(agendaSelettoreData.value)
    : '';
}

agendaDataVisibile.addEventListener('click', () => {
  if (typeof agendaSelettoreData.showPicker === 'function') {
    agendaSelettoreData.showPicker();
  } else {
    agendaSelettoreData.focus();
  }
});

function getTurniAgenda(row, data) {
  const giorno = getGiornoSettimana(data);
  const base = row._dati.giorni[giorno] || row._dati.turni;
  const agendaTurni = row._dati.agenda && row._dati.agenda[data];
  if (!agendaTurni) return base;
  return [
    ...agendaTurni,
    ...copiaTurni(base.slice(agendaTurni.length))
  ];
}

function getMinutiTurni(turni) {
  return turni.reduce((totale, turno) => {
    const inizio = parseOra(turno.inizio);
    const fine = parseOra(turno.fine);
    if (inizio === null || fine === null || inizio === fine) return totale;
    return totale + (fine < inizio ? fine + 24 * 60 - inizio : fine - inizio);
  }, 0);
}

function leggiTurniAgenda(container) {
  return [...container.querySelectorAll('.turno')].map(turno => {
    const inputs = turno.querySelectorAll('.orario-input');
    return { inizio: inputs[0].value, fine: inputs[1].value };
  });
}

function aggiornaTurniAgenda(row, container, data) {
  row._dati.agenda[data] = leggiTurniAgenda(container);
  salvaDipendenti(false);
  aggiornaTotaleAgenda(row, container, data);
}

function aggiornaTotaleAgenda(row, container, data) {
  const turniAgenda = leggiTurniAgenda(container);
  const giorno = getGiornoSettimana(data);
  const base = row._dati.giorni[giorno] || row._dati.turni;
  const assenze = row._dati.assenze[data] || {};
  const totaleCell = container._totaleCell;
  totaleCell.innerHTML = '';
  turniAgenda.forEach((turno, indice) => {
    const valore = document.createElement('span');
    valore.className = 'tot-valore';
    if (assenze[indice]) {
      valore.classList.add('totale-assenza');
      valore.textContent = '/';
      const perdita = document.createElement('span');
      perdita.className = 'assenza-perdita';
      perdita.textContent = `-${getMinutiTurni(base.slice(indice, indice + 1))}`;
      valore.appendChild(perdita);
    } else {
      const differenza = getMinutiTurni([turno]) - getMinutiTurni(base.slice(indice, indice + 1));
      valore.textContent = `${differenza >= 0 ? '+' : ''}${differenza}`;
    }
    totaleCell.appendChild(valore);
  });
}

function creaTurnoAgenda(row, turno, container, data, indice, eliminabile = false) {
  const div = document.createElement('div');
  div.className = 'turno';
  const assenza = row._dati.assenze[data] && row._dati.assenze[data][indice];
  const inizio = document.createElement('input');
  inizio.className = 'orario-input';
  inizio.type = 'text';
  inizio.placeholder = 'HH:MM';
  inizio.inputMode = 'numeric';
  inizio.maxLength = 6;
  inizio.value = turno.inizio || '';
  inizio.setAttribute('aria-label', 'Orario di inizio agenda');
  inizio.addEventListener('keydown', evento => gestisciSpazioOra(inizio, evento));
  inizio.addEventListener('input', () => {
    formattaInputOra(inizio);
    aggiornaTurniAgenda(row, container, data);
  });
  const separatore = document.createElement('span');
  separatore.textContent = '/';
  const fine = document.createElement('input');
  fine.className = 'orario-input';
  fine.type = 'text';
  fine.placeholder = 'HH:MM';
  fine.inputMode = 'numeric';
  fine.maxLength = 6;
  fine.value = turno.fine || '';
  fine.setAttribute('aria-label', 'Orario di fine agenda');
  fine.addEventListener('keydown', evento => gestisciSpazioOra(fine, evento));
  fine.addEventListener('input', () => {
    formattaInputOra(fine);
    aggiornaTurniAgenda(row, container, data);
  });
  const btnAssente = document.createElement('button');
  btnAssente.type = 'button';
  btnAssente.className = 'btn-assente';
  btnAssente.textContent = assenza ? 'Presente' : 'Assente';
  div.classList.toggle('turno-assente', Boolean(assenza));
  div.append(inizio, separatore, fine, btnAssente);
  btnAssente.addEventListener('click', () => {
    const assenze = row._dati.assenze[data] || (row._dati.assenze[data] = {});
    if (assenze[indice]) {
      delete assenze[indice];
      div.classList.remove('turno-assente');
      btnAssente.textContent = 'Assente';
      salvaDipendenti(false);
      aggiornaTotaleAgenda(row, container, data);
    } else {
      assenze[indice] = {};
      div.classList.add('turno-assente');
      btnAssente.textContent = 'Presente';
      salvaDipendenti(false);
      aggiornaTotaleAgenda(row, container, data);
    }
  });
  if (eliminabile) {
    const elimina = document.createElement('button');
    elimina.type = 'button';
    elimina.className = 'btn-elimina-turno';
    elimina.textContent = 'Elimina';
    elimina.title = 'Elimina turno extra';
    elimina.addEventListener('click', () => {
      const intervallo = `${inizio.value || 'HH:MM'} - ${fine.value || 'HH:MM'}`;
      if (!window.confirm(`Sei sicuro di voler eliminare il turno ${intervallo}?`)) return;
      div.remove();
      const assenze = row._dati.assenze[data];
      if (assenze) {
        delete assenze[indice];
        Object.keys(assenze)
          .map(Number)
          .filter(posizione => posizione > indice)
          .sort((a, b) => a - b)
          .forEach(posizione => {
            assenze[posizione - 1] = assenze[posizione];
            delete assenze[posizione];
          });
      }
      aggiornaTurniAgenda(row, container, data);
    });
    div.appendChild(elimina);
  }
  return div;
}

function aggiornaAgenda() {
  agendaBody.innerHTML = '';
  agendaSelettoreOrdinamento.value = selettoreOrdinamento.value;
  agendaBtnSalvaOrdine.disabled = selettoreOrdinamento.value !== 'personalizzato';
  const data = getDataAgenda();

  dipBody.querySelectorAll('.dip-row').forEach(row => {
    const agendaRow = document.createElement('tr');
    agendaRow.className = 'dip-row';

    const tdNome = document.createElement('td');
    tdNome.className = 'cell-nome';
    tdNome.textContent = row._dati.nome || 'Nome...';

    const tdOrari = document.createElement('td');
    tdOrari.className = 'cell-orari';
    const turni = getTurniAgenda(row, data);
    const base = row._dati.giorni[getGiornoSettimana(data)] || row._dati.turni;
    turni.forEach((turno, indice) => {
      tdOrari.appendChild(creaTurnoAgenda(row, turno, tdOrari, data, indice, indice >= base.length));
    });
    const btnTurno = document.createElement('button');
    btnTurno.type = 'button';
    btnTurno.className = 'btn-add-turno';
    btnTurno.textContent = '+ turno';
    btnTurno.addEventListener('click', () => {
      const indice = tdOrari.querySelectorAll('.turno').length;
      tdOrari.insertBefore(creaTurnoAgenda(row, {}, tdOrari, data, indice, true), btnTurno);
      aggiornaTurniAgenda(row, tdOrari, data);
    });
    tdOrari.appendChild(btnTurno);

    const tdTot = document.createElement('td');
    tdTot.className = 'cell-tot';
    tdOrari._totaleCell = tdTot;
    aggiornaTotaleAgenda(row, tdOrari, data);

    agendaRow.append(tdNome, tdOrari, tdTot);
    agendaBody.appendChild(agendaRow);
  });
}

function salvaDipendenti(aggiornaVista = true) {
  const dipendenti = [...dipBody.querySelectorAll('.dip-row')].map(row => ({
    id: row.dataset.id,
    nome: row._dati.nome,
    turni: row._dati.turni,
    giorni: row._dati.giorni,
    agenda: row._dati.agenda,
    assenze: row._dati.assenze,
    inizializzato: row._dati.inizializzato
  }));

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dipendenti));
    if (aggiornaVista) aggiornaAgenda();
    aggiornaRiepilogo();
  } catch (error) {
    console.error('Impossibile salvare i dipendenti:', error);
  }
}

// Crea un turno (riga orario)
function creaTurno(row, valori = {}, eliminabile = false) {
  const div = document.createElement('div');
  div.className = 'turno';

  const inputInizio = document.createElement('input');
  inputInizio.type = 'text';
  inputInizio.placeholder = 'HH:MM';
  inputInizio.inputMode = 'numeric';
  inputInizio.maxLength = 6;
  inputInizio.value = valori.inizio || '';
  inputInizio.disabled = row.dataset.modifica !== 'true';
  inputInizio.setAttribute('aria-label', 'Orario di inizio');
  inputInizio.addEventListener('keydown', evento => gestisciSpazioOra(inputInizio, evento));
  inputInizio.addEventListener('input', () => {
    formattaInputOra(inputInizio);
    aggiornaTotali(row);
    aggiornaDatiRiga(row);
  });

  const sep = document.createElement('span');
  sep.textContent = '/';

  const inputFine = document.createElement('input');
  inputFine.type = 'text';
  inputFine.placeholder = 'HH:MM';
  inputFine.inputMode = 'numeric';
  inputFine.maxLength = 6;
  inputFine.value = valori.fine || '';
  inputFine.disabled = row.dataset.modifica !== 'true';
  inputFine.setAttribute('aria-label', 'Orario di fine');
  inputFine.addEventListener('keydown', evento => gestisciSpazioOra(inputFine, evento));
  inputFine.addEventListener('input', () => {
    formattaInputOra(inputFine);
    aggiornaTotali(row);
    aggiornaDatiRiga(row);
  });

  div.appendChild(inputInizio);
  div.appendChild(sep);
  div.appendChild(inputFine);
  if (eliminabile) {
    const btnEliminaTurno = document.createElement('button');
    btnEliminaTurno.type = 'button';
    btnEliminaTurno.className = 'btn-elimina-turno';
    btnEliminaTurno.textContent = 'Elimina';
    btnEliminaTurno.title = 'Elimina turno';
    btnEliminaTurno.disabled = row.dataset.modifica !== 'true';
    btnEliminaTurno.addEventListener('click', () => {
      const intervallo = `${inputInizio.value || 'HH:MM'} - ${inputFine.value || 'HH:MM'}`;
      if (!window.confirm(`Sei sicuro di voler eliminare il turno ${intervallo}?`)) return;
      div.remove();
      aggiornaTotali(row);
      aggiornaDatiRiga(row);
    });
    div.appendChild(btnEliminaTurno);
  }
  return div;
}

// Aggiungi un dipendente
function aggiungiDipendente(dati = {}) {
  const row = document.createElement('tr');
  row.className = 'dip-row';
  row.dataset.id = dati.id || `dipendente-${Date.now()}-${prossimoId++}`;
  row.dataset.modifica = dati.nome || dati.turni ? 'false' : 'true';
  row._dati = {
    nome: dati.nome || '',
    turni: dati.turni && dati.turni.length ? dati.turni : [{}],
    giorni: dati.giorni && typeof dati.giorni === 'object' ? dati.giorni : {},
    agenda: dati.agenda && typeof dati.agenda === 'object' ? dati.agenda : {},
    assenze: dati.assenze && typeof dati.assenze === 'object' ? dati.assenze : {},
    inizializzato: dati.inizializzato !== false && Boolean(dati.turni && haOrari(dati.turni))
  };

  // Cella nome
  const tdNome = document.createElement('td');
  tdNome.className = 'cell-nome';
  const inputNome = document.createElement('input');
  inputNome.type = 'text';
  inputNome.placeholder = 'Nome...';
  inputNome.value = dati.nome || '';
  inputNome.disabled = row.dataset.modifica !== 'true';
  inputNome.setAttribute('aria-label', 'Nome dipendente');
  inputNome.addEventListener('input', () => {
    row._dati.nome = inputNome.value;
    salvaDipendenti();
    if (selettoreOrdinamento.value === 'az') ordinaDipendenti();
  });
  tdNome.appendChild(inputNome);

  const azioni = document.createElement('div');
  azioni.className = 'azioni-dipendente';
  const btnModifica = document.createElement('button');
  btnModifica.type = 'button';
  btnModifica.className = 'btn-modifica';
  btnModifica.textContent = row.dataset.modifica === 'true' ? 'Salva' : 'Modifica';
  btnModifica.addEventListener('click', () => impostaModifica(row, btnModifica));
  const btnElimina = document.createElement('button');
  btnElimina.type = 'button';
  btnElimina.className = 'btn-elimina';
  btnElimina.textContent = 'Elimina';
  btnElimina.hidden = row.dataset.modifica !== 'true';
  btnElimina.addEventListener('click', () => eliminaDipendente(row));
  azioni.append(btnModifica, btnElimina);
  tdNome.appendChild(azioni);

  // Cella orari
  const tdOrari = document.createElement('td');
  tdOrari.className = 'cell-orari';
  const turni = row._dati.giorni[selettoreGiorno.value] || row._dati.turni;
  turni.forEach((turno, indice) => tdOrari.appendChild(creaTurno(row, turno, indice > 0)));

  // Bottone + turno
  const btnTurno = document.createElement('button');
  btnTurno.className = 'btn-add-turno';
  btnTurno.textContent = '+ turno';
  btnTurno.disabled = row.dataset.modifica !== 'true';
  btnTurno.addEventListener('click', () => {
    tdOrari.insertBefore(creaTurno(row, {}, true), btnTurno);
    aggiornaDatiRiga(row);
  });
  tdOrari.appendChild(btnTurno);

  // Cella totale
  const tdTot = document.createElement('td');
  tdTot.className = 'cell-tot';
  const totaliValori = document.createElement('div');
  totaliValori.className = 'totali-valori';
  tdTot.appendChild(totaliValori);

  row.appendChild(tdNome);
  row.appendChild(tdOrari);
  row.appendChild(tdTot);
  dipBody.appendChild(row);
  configuraTrascinamento(row);

  aggiornaTotali(row);
  salvaDipendenti();
  if (!dati.nome && !dati.turni) inputNome.focus();
}

function impostaModifica(row, btnModifica) {
  const inModifica = row.dataset.modifica !== 'true';
  row.dataset.modifica = inModifica ? 'true' : 'false';
  row.querySelectorAll('.cell-nome input, .turno input').forEach(input => {
    input.disabled = !inModifica;
  });
  row.querySelector('.btn-add-turno').disabled = !inModifica;
  row.querySelectorAll('.btn-elimina-turno').forEach(button => {
    button.disabled = !inModifica;
  });
  btnModifica.textContent = inModifica ? 'Salva' : 'Modifica';
  row.querySelector('.btn-elimina').hidden = !inModifica;
  if (!inModifica) salvaDipendenti();
}

function eliminaDipendente(row) {
  const nome = row.querySelector('.cell-nome input').value.trim() || 'questo dipendente';
  if (!window.confirm(`Sei sicuro di voler eliminare ${nome}?`)) return;
  row.remove();
  salvaDipendenti();
}

function aggiornaAzioniOrdine() {
  const personalizzato = selettoreOrdinamento.value === 'personalizzato';
  btnSalvaOrdine.disabled = !personalizzato;
  document.querySelectorAll('.dip-row').forEach(row => {
    row.draggable = personalizzato;
    row.classList.toggle('trascinabile', personalizzato);
  });
  aggiornaAgenda();
}

function ordinaDipendenti() {
  const righe = [...dipBody.querySelectorAll('.dip-row')];
  localStorage.setItem(ORDER_KEY, selettoreOrdinamento.value);
  if (selettoreOrdinamento.value === 'az') {
    righe.sort((a, b) => a.querySelector('.cell-nome input').value.localeCompare(
      b.querySelector('.cell-nome input').value,
      'it',
      { sensitivity: 'base' }
    ));
    righe.forEach(row => dipBody.appendChild(row));
  } else if (selettoreOrdinamento.value === 'orario') {
    righe.sort((a, b) => getMinutiInizio(a) - getMinutiInizio(b));
    righe.forEach(row => dipBody.appendChild(row));
  } else if (selettoreOrdinamento.value === 'totale') {
    righe.sort((a, b) => getTotaleMinuti(b) - getTotaleMinuti(a));
    righe.forEach(row => dipBody.appendChild(row));
  } else {
    const posizione = new Map(ordinePersonalizzato.map((id, indice) => [id, indice]));
    righe.sort((a, b) => (posizione.get(a.dataset.id) ?? Number.MAX_SAFE_INTEGER) -
      (posizione.get(b.dataset.id) ?? Number.MAX_SAFE_INTEGER));
    righe.forEach(row => dipBody.appendChild(row));
  }
  aggiornaAzioniOrdine();
  salvaDipendenti();
}

function salvaOrdinePersonalizzato() {
  if (selettoreOrdinamento.value !== 'personalizzato') return;
  ordinePersonalizzato = [...dipBody.querySelectorAll('.dip-row')].map(row => row.dataset.id);
  localStorage.setItem(CUSTOM_ORDER_KEY, JSON.stringify(ordinePersonalizzato));
  btnSalvaOrdine.textContent = 'Ordine salvato';
  setTimeout(() => {
    btnSalvaOrdine.textContent = 'Salva ordine';
  }, 1500);
}

function configuraTrascinamento(row) {
  row.draggable = selettoreOrdinamento.value === 'personalizzato';

  row.addEventListener('dragstart', event => {
    if (selettoreOrdinamento.value !== 'personalizzato') {
      event.preventDefault();
      return;
    }
    row.classList.add('in-trascinamento');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', '');
  });

  row.addEventListener('dragend', () => {
    row.classList.remove('in-trascinamento');
    document.querySelectorAll('.dip-row').forEach(riga => riga.classList.remove('destinazione-trascinamento'));
  });

  row.addEventListener('dragover', event => {
    if (selettoreOrdinamento.value !== 'personalizzato' || row.classList.contains('in-trascinamento')) return;
    event.preventDefault();
    const draggedRow = document.querySelector('.in-trascinamento');
    if (!draggedRow) return;
    const rettangolo = row.getBoundingClientRect();
    const inserisciPrima = event.clientY < rettangolo.top + rettangolo.height / 2;
    row.classList.toggle('destinazione-trascinamento', true);
    if (inserisciPrima) {
      dipBody.insertBefore(draggedRow, row);
    } else {
      dipBody.insertBefore(draggedRow, row.nextSibling);
    }
  });

  row.addEventListener('dragleave', () => row.classList.remove('destinazione-trascinamento'));
  row.addEventListener('drop', event => {
    event.preventDefault();
    row.classList.remove('destinazione-trascinamento');
    salvaDipendenti();
  });
}

function caricaDipendenti() {
  try {
    const datiSalvati = localStorage.getItem(STORAGE_KEY);
    if (!datiSalvati) return;

    const dipendenti = JSON.parse(datiSalvati);
    if (!Array.isArray(dipendenti)) return;
    const ordineSalvato = localStorage.getItem(CUSTOM_ORDER_KEY);
    if (ordineSalvato) {
      const ordine = JSON.parse(ordineSalvato);
      if (Array.isArray(ordine)) ordinePersonalizzato = ordine;
    }
    const giornoSalvato = localStorage.getItem(DAY_KEY);
    if (giornoSalvato && selettoreGiorno.querySelector(`option[value="${giornoSalvato}"]`)) {
      selettoreGiorno.value = giornoSalvato;
    }
    const dataSalvata = localStorage.getItem(AGENDA_DATE_KEY);
    if (dataSalvata && /^\d{4}-\d{2}-\d{2}$/.test(dataSalvata)) {
      agendaSelettoreData.value = dataSalvata;
    }
    const ordinamentoSalvato = localStorage.getItem(ORDER_KEY);
    if (ordinamentoSalvato === 'az' || ordinamentoSalvato === 'orario' ||
      ordinamentoSalvato === 'totale' || ordinamentoSalvato === 'personalizzato') {
      selettoreOrdinamento.value = ordinamentoSalvato;
    }
    caricamentoInCorso = true;
    dipendenti.forEach(aggiungiDipendente);
    caricamentoInCorso = false;
    const idsPresenti = new Set(dipendenti.map(dipendente => dipendente.id).filter(Boolean));
    ordinePersonalizzato = [
      ...ordinePersonalizzato.filter(id => idsPresenti.has(id)),
      ...dipendenti.map(dipendente => dipendente.id).filter(id => id && !ordinePersonalizzato.includes(id))
    ];
    ordinaDipendenti();
  } catch (error) {
    console.error('Impossibile caricare i dipendenti salvati:', error);
  }
}

btnAggiungi.addEventListener('click', aggiungiDipendente);
selettoreOrdinamento.addEventListener('change', ordinaDipendenti);
selettoreGiorno.addEventListener('change', aggiornaGiorno);
btnSalvaOrdine.addEventListener('click', salvaOrdinePersonalizzato);
btnAggiungiTuttiGiorni.addEventListener('click', aggiungiOrarioATuttiIGiorni);
agendaSelettoreOrdinamento.addEventListener('change', () => {
  selettoreOrdinamento.value = agendaSelettoreOrdinamento.value;
  ordinaDipendenti();
});
agendaBtnSalvaOrdine.addEventListener('click', salvaOrdinePersonalizzato);
agendaSelettoreData.addEventListener('change', () => {
  localStorage.setItem(AGENDA_DATE_KEY, agendaSelettoreData.value);
  aggiornaDataAgendaVisibile();
  aggiornaAgenda();
});
riepilogoMese.addEventListener('change', aggiornaRiepilogo);
riepilogoMeseVisibile.addEventListener('click', () => {
  if (typeof riepilogoMese.showPicker === 'function') {
    riepilogoMese.showPicker();
  } else {
    riepilogoMese.focus();
  }
});
riepilogoMesePrecedente.addEventListener('click', () => {
  const data = new Date(`${riepilogoMese.value}-01T12:00:00`);
  data.setMonth(data.getMonth() - 1);
  riepilogoMese.value = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
  aggiornaMeseRiepilogoVisibile();
  aggiornaRiepilogo();
});
riepilogoMeseSuccessivo.addEventListener('click', () => {
  const data = new Date(`${riepilogoMese.value}-01T12:00:00`);
  data.setMonth(data.getMonth() + 1);
  riepilogoMese.value = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
  aggiornaMeseRiepilogoVisibile();
  aggiornaRiepilogo();
});
caricaDipendenti();
if (!agendaSelettoreData.value) {
  const oggi = new Date();
  agendaSelettoreData.value = [
    oggi.getFullYear(),
    String(oggi.getMonth() + 1).padStart(2, '0'),
    String(oggi.getDate()).padStart(2, '0')
  ].join('-');
}
localStorage.setItem(AGENDA_DATE_KEY, agendaSelettoreData.value);
aggiornaDataAgendaVisibile();
const oggiRiepilogo = new Date();
riepilogoMese.value = `${oggiRiepilogo.getFullYear()}-${String(oggiRiepilogo.getMonth() + 1).padStart(2, '0')}`;
aggiornaMeseRiepilogoVisibile();
aggiornaAgenda();
aggiornaRiepilogo();
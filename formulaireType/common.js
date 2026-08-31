/* =========================================================
   Template Voyage Cacher — Code commun aux deux pages
   (formulaire, carrousel, réception du contenu publié)

   Chargé par index.html (admin) ET public.html (lecture seule).
   Les éléments propres à l'admin sont testés avant usage.
   ========================================================= */

const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const MOUVEMENT_REDUIT = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* =========================================================
   1) COMPTEURS DE VOYAGEURS (− / +)
   ========================================================= */

const champsCompteurs = $$('.stepper__val');

/* Valeur du champ ramenée dans les bornes min/max (une saisie vide vaut le minimum). */
function valeurCompteur(champ) {
  const min = Number(champ.min || 0);
  const max = Number(champ.max || 99);
  const n = parseInt(champ.value, 10);
  return Math.max(min, Math.min(max, Number.isNaN(n) ? min : n));
}

/* Grise les boutons qui sortiraient des bornes. `corriger` réécrit la valeur :
   on ne le fait qu'à la validation, pour ne pas gêner la saisie au clavier. */
function rafraichirCompteur(champ, corriger) {
  const valeur = valeurCompteur(champ);
  if (corriger && champ.value !== String(valeur)) champ.value = valeur;

  $$('.stepper__btn[data-cible="' + champ.id + '"]').forEach(btn => {
    const vise = valeur + Number(btn.dataset.pas);
    btn.disabled = vise < Number(champ.min) || vise > Number(champ.max);
  });
  return valeur;
}

$$('.stepper__btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const champ = $('#' + btn.dataset.cible);
    champ.value = valeurCompteur(champ) + Number(btn.dataset.pas);
    rafraichirCompteur(champ, true);
    if (champ.id === 'enfants') construireAges();
  });
});

champsCompteurs.forEach(champ => {
  champ.addEventListener('input', () => {
    rafraichirCompteur(champ, false);
    if (champ.id === 'enfants') construireAges();
  });
  champ.addEventListener('change', () => {
    rafraichirCompteur(champ, true);
    if (champ.id === 'enfants') construireAges();
  });
  rafraichirCompteur(champ, true);
});

/* =========================================================
   1 bis) ÂGES DES ENFANTS (affichage progressif)
   ========================================================= */

const champEnfants = $('#enfants');
const zoneEnfants  = $('#zoneEnfants');
const listeEnfants = $('#listeEnfants');

// Les moins de 2 ans sont comptés comme bébés, dans leur propre compteur.
const AGES = ['2 ans', '3 ans', '4 ans', '5 ans', '6 ans', '7 ans',
              '8 ans', '9 ans', '10 ans', '11 ans', '12 ans', '13 ans', '14 ans',
              '15 ans', '16 ans', '17 ans'];

// Mémorisés à part : les âges déjà choisis survivent à un passage par 0.
let agesMemo = [];

function construireAges() {
  const nb = valeurCompteur(champEnfants);

  listeEnfants.innerHTML = '';
  zoneEnfants.hidden = nb === 0;
  if (nb === 0) return;

  for (let i = 1; i <= nb; i++) {
    const field = document.createElement('div');
    field.className = 'field';

    const label = document.createElement('label');
    label.setAttribute('for', 'enfant' + i);
    label.textContent = 'Enfant ' + i;

    const control = document.createElement('div');
    control.className = 'control';

    const select = document.createElement('select');
    select.id = 'enfant' + i;
    select.name = 'enfant' + i;
    AGES.forEach(age => {
      const opt = document.createElement('option');
      opt.value = age;
      opt.textContent = age;
      select.appendChild(opt);
    });
    if (agesMemo[i - 1]) select.value = agesMemo[i - 1];
    select.addEventListener('change', () => { agesMemo[i - 1] = select.value; });

    control.appendChild(select);
    field.append(label, control);
    listeEnfants.appendChild(field);
  }
}

construireAges();

/* =========================================================
   2) VALIDATION ET ENVOI DU FORMULAIRE
   ========================================================= */

const form        = $('#formRappel');
const btnEnvoyer  = $('#btnEnvoyer');
const panneauOk   = $('#succes');
const btnNouvelle = $('#btnNouvelle');

const REGLES = {
  nom: {
    test: v => v.trim().length >= 2,
    message: 'Indiquez votre nom (2 caractères minimum).'
  },
  tel: {
    test: v => /^[+0-9][0-9\s.\-()]{7,17}$/.test(v.trim()),
    message: 'Numéro invalide. Exemple : 06 12 34 56 78.'
  },
  email: {
    test: v => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim()),
    message: 'Adresse e-mail invalide. Exemple : vous@exemple.com.'
  }
};

function validerChamp(id, afficher = true) {
  const champ = $('#' + id);
  const bloc = $('#err-' + id);
  const ok = REGLES[id].test(champ.value);

  if (afficher) {
    champ.classList.toggle('is-error', !ok);
    champ.setAttribute('aria-invalid', String(!ok));
    bloc.classList.toggle('is-visible', !ok);
    bloc.innerHTML = ok
      ? ''
      : '<svg class="ic ic--sm" aria-hidden="true"><use href="#i-alert"/></svg>' + REGLES[id].message;
  }
  return ok;
}

// Validation à la sortie du champ (pas à chaque frappe)
Object.keys(REGLES).forEach(id => {
  const champ = $('#' + id);
  champ.addEventListener('blur', () => validerChamp(id));
  // une fois l'erreur affichée, on la corrige en direct
  champ.addEventListener('input', () => {
    if (champ.classList.contains('is-error')) validerChamp(id);
  });
});

form.addEventListener('submit', e => {
  e.preventDefault();

  const invalides = Object.keys(REGLES).filter(id => !validerChamp(id));
  if (invalides.length) {
    const premier = $('#' + invalides[0]);
    premier.focus({ preventScroll: true });
    premier.scrollIntoView({ block: 'center', behavior: MOUVEMENT_REDUIT ? 'auto' : 'smooth' });
    return;
  }

  const donnees = {
    adultes:   valeurCompteur($('#adultes')),
    enfants:   valeurCompteur(champEnfants),
    bebes:     valeurCompteur($('#bebes')),
    ages:      $$('select', listeEnfants).map(s => s.value),
    nom:       $('#nom').value.trim(),
    telephone: $('#tel').value.trim(),
    email:     $('#email').value.trim(),
    message:   $('#message').value.trim(),
    parMail:   $('#parMail').checked,
    whatsapp:  $('#whatsapp').checked
  };

  // État de chargement, puis succès (à brancher sur votre back-end / API)
  btnEnvoyer.setAttribute('aria-busy', 'true');
  btnEnvoyer.disabled = true;
  $('.btn__label', btnEnvoyer).textContent = 'Envoi en cours…';

  setTimeout(() => {
    console.log('Demande de rappel :', donnees);
    form.hidden = true;
    panneauOk.hidden = false;
    panneauOk.scrollIntoView({ block: 'center', behavior: MOUVEMENT_REDUIT ? 'auto' : 'smooth' });
    $('.success__title', panneauOk).setAttribute('tabindex', '-1');
    $('.success__title', panneauOk).focus({ preventScroll: true });
  }, 900);
});

btnNouvelle.addEventListener('click', () => {
  form.reset();
  agesMemo = [];
  champsCompteurs.forEach(champ => rafraichirCompteur(champ, true));
  construireAges();
  Object.keys(REGLES).forEach(id => {
    $('#' + id).classList.remove('is-error');
    $('#' + id).removeAttribute('aria-invalid');
    $('#err-' + id).classList.remove('is-visible');
  });
  btnEnvoyer.removeAttribute('aria-busy');
  btnEnvoyer.disabled = false;
  $('.btn__label', btnEnvoyer).textContent = 'Envoyer ma demande';
  panneauOk.hidden = true;
  form.hidden = false;
  $('#nom').focus();
});

/* =========================================================
   3) CARROUSEL PHOTOS
   ========================================================= */

const piste      = $('#slides');
const puces      = $('#puces');
const compteur   = $('#compteur');
const slider     = $('#slider');
const btnPrev    = $('#prev');
const btnNext    = $('#next');
const supprPhoto = $('#supprPhoto');     // page admin uniquement

// Visuels de démonstration — remplacez par vos photos (chemins ou URLs)
function visuelDemo(titre, c1, c2) {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/>' +
      '</linearGradient></defs>' +
      '<rect width="800" height="600" fill="url(#g)"/>' +
      '<text x="400" y="312" text-anchor="middle" font-family="Georgia,serif" ' +
      'font-size="40" fill="#ffffff">' + titre + '</text>' +
    '</svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

const PHOTOS_DEFAUT = [
  visuelDemo('Photo 1', '#0B5E75', '#4EA3BE'),
  visuelDemo('Photo 2', '#9A6D14', '#D6A94A'),
  visuelDemo('Photo 3', '#0E7490', '#57BFC4')
];

let photos = PHOTOS_DEFAUT.slice();
let index = 0;

function rendreSlider() {
  piste.innerHTML = '';
  puces.innerHTML = '';

  const vide = photos.length === 0;
  btnPrev.hidden = btnNext.hidden = photos.length < 2;
  if (supprPhoto) supprPhoto.disabled = vide;

  if (vide) {
    const bloc = document.createElement('div');
    bloc.className = 'slider__empty';
    bloc.textContent = supprPhoto
      ? 'Aucune photo pour le moment. Utilisez « Ajouter des photos ».'
      : 'Aucune photo pour le moment.';
    piste.appendChild(bloc);
    piste.style.transform = 'translateX(0)';
    compteur.textContent = '0 / 0';
    return;
  }

  index = Math.max(0, Math.min(index, photos.length - 1));

  photos.forEach((src, i) => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = 'Photo ' + (i + 1) + ' sur ' + photos.length;
    img.loading = i === 0 ? 'eager' : 'lazy';
    img.decoding = 'async';
    piste.appendChild(img);

    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'dot';
    dot.setAttribute('aria-label', 'Photo ' + (i + 1));
    dot.setAttribute('aria-current', String(i === index));
    dot.addEventListener('click', () => aller(i));
    puces.appendChild(dot);
  });

  piste.style.transform = 'translateX(-' + (index * 100) + '%)';
  compteur.textContent = (index + 1) + ' / ' + photos.length;
}

function aller(i) {
  if (photos.length === 0) return;
  index = (i + photos.length) % photos.length;
  rendreSlider();
}

btnPrev.addEventListener('click', () => aller(index - 1));
btnNext.addEventListener('click', () => aller(index + 1));

// Clavier
slider.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft')  { e.preventDefault(); aller(index - 1); }
  if (e.key === 'ArrowRight') { e.preventDefault(); aller(index + 1); }
});

// Glissement au doigt (seuil pour éviter les déclenchements involontaires)
let departX = null, departY = null;
piste.addEventListener('touchstart', e => {
  departX = e.touches[0].clientX;
  departY = e.touches[0].clientY;
}, { passive: true });
piste.addEventListener('touchend', e => {
  if (departX === null) return;
  const dx = e.changedTouches[0].clientX - departX;
  const dy = e.changedTouches[0].clientY - departY;
  if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) aller(index + (dx < 0 ? 1 : -1));
  departX = departY = null;
}, { passive: true });

// Petite API utilisée par la page admin (script.js)
const Carrousel = {
  get photos() { return photos; },
  get index()  { return index; },
  definir(liste, positionner) {
    photos = liste.slice();
    if (typeof positionner === 'number') index = positionner;
    rendreSlider();
  }
};

/* =========================================================
   4) CONTENU PUBLIÉ (lu dans le store partagé)
   ========================================================= */

// #editeur sur la page admin, #contenu sur la page publique.
const zoneContenu = $('#editeur') || $('#contenu');
const CONTENU_DEFAUT = zoneContenu ? zoneContenu.innerHTML : '';
const estAdmin = !!$('#editeur');

const temoinMaj = $('#temoinMaj');   // page publique uniquement

/* Applique un état du store à la page. */
function appliquerEtat(etat) {
  if (zoneContenu) {
    // Sur l'admin, ne jamais écraser ce que l'utilisateur est en train d'écrire.
    const enEdition = estAdmin && document.activeElement === zoneContenu;
    if (!enEdition) zoneContenu.innerHTML = etat.presentation || CONTENU_DEFAUT;
  }
  Carrousel.definir(Array.isArray(etat.photos) ? etat.photos : PHOTOS_DEFAUT);
}

appliquerEtat(Store.lire());

// Mise à jour poussée par un autre onglet (typiquement la page admin)
Store.surChangement(etat => {
  appliquerEtat(etat);
  if (!temoinMaj) return;
  temoinMaj.classList.add('is-on');
  clearTimeout(temoinMaj._t);
  temoinMaj._t = setTimeout(() => temoinMaj.classList.remove('is-on'), 2600);
});

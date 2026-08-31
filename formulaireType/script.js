/* =========================================================
   Template Voyage Cacher — Page ADMIN (index.html)

   Éditeur de texte, gestion des photos, publication.
   Tout ce qui est publié ici est repris par public.html
   (voir sync.js pour le canal, common.js pour l'affichage).

   Dépend de : sync.js, common.js — chargés avant ce fichier.
   ========================================================= */

const editeur    = $('#editeur');
const barre      = $('#barreOutils');
const imgEditeur = $('#imgEditeur');
const etat       = $('#etatSauvegarde');
const ajoutPhotos = $('#ajoutPhotos');

/* =========================================================
   1) PUBLICATION VERS LA PAGE PUBLIQUE
   ========================================================= */

function afficherEtat(texte, erreur = false) {
  etat.textContent = texte;
  etat.style.color = erreur ? 'var(--danger)' : 'var(--success)';
  clearTimeout(afficherEtat.t);
  afficherEtat.t = setTimeout(() => { etat.textContent = ''; }, 4000);
}

/* Écrit dans le store et signale l'échec éventuel (quota, navigation privée…). */
function publier(modification, message) {
  const res = Store.ecrire(modification);
  if (!res.ok) {
    afficherEtat(res.raison === 'quota'
      ? 'Espace de stockage saturé : supprimez des photos avant de publier.'
      : 'Publication impossible sur cet appareil (stockage indisponible).', true);
    return false;
  }
  if (message) afficherEtat(message);
  return true;
}

// Publication automatique pendant la frappe, pour que la page publique suive en direct.
let minuteurPublication = null;
function publierPlusTard() {
  clearTimeout(minuteurPublication);
  minuteurPublication = setTimeout(() => {
    publier({ presentation: editeur.innerHTML });
    etatDirect('Publié à l\'instant');
  }, 800);
}

const infoDirect = $('#infoDirect');
function etatDirect(texte) {
  if (infoDirect) infoDirect.textContent = texte;
}

editeur.addEventListener('input', () => {
  etatDirect('Modification en cours…');
  publierPlusTard();
});

/* =========================================================
   2) ÉDITEUR DE TEXTE
   ========================================================= */

// La sélection est perdue au clic sur la barre d'outils : on la mémorise.
let selectionMemo = null;

function memoriserSelection() {
  const sel = window.getSelection();
  if (sel && sel.rangeCount && editeur.contains(sel.anchorNode)) {
    selectionMemo = sel.getRangeAt(0);
  }
}
function restaurerSelection() {
  editeur.focus();
  if (!selectionMemo) return;
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(selectionMemo);
}

['keyup', 'mouseup', 'touchend', 'blur'].forEach(evt =>
  editeur.addEventListener(evt, memoriserSelection)
);

function executer(commande, valeur) {
  restaurerSelection();
  document.execCommand(commande, false, valeur ?? null);
  memoriserSelection();
  rafraichirEtats();
  publierPlusTard();
}

// Boutons
$$('button[data-cmd]', barre).forEach(btn => {
  btn.addEventListener('mousedown', e => e.preventDefault()); // conserver la sélection
  btn.addEventListener('click', () => {
    if (btn.dataset.cmd === 'createLink') {
      const url = prompt('Adresse du lien (https://…)');
      if (url) executer('createLink', url);
      return;
    }
    executer(btn.dataset.cmd);
  });
});

// Listes déroulantes
$$('select[data-cmd]', barre).forEach(sel => {
  sel.addEventListener('change', () => {
    if (!sel.value) return;
    const valeur = sel.dataset.cmd === 'formatBlock' ? '<' + sel.value + '>' : sel.value;
    executer(sel.dataset.cmd, valeur);
    if (sel.dataset.cmd === 'fontSize') sel.selectedIndex = 0;
  });
});

// Couleurs
$$('input[type="color"][data-cmd]', barre).forEach(input => {
  input.addEventListener('input', () => {
    executer(input.dataset.cmd, input.value);
    const pastille = input.previousElementSibling;
    if (pastille) pastille.style.setProperty('--sw', input.value);
  });
});

// Boutons actifs selon la sélection
const ETATS = ['bold', 'italic', 'underline', 'strikeThrough',
               'justifyLeft', 'justifyCenter', 'justifyRight',
               'insertUnorderedList', 'insertOrderedList'];

function rafraichirEtats() {
  ETATS.forEach(cmd => {
    const btn = $('button[data-cmd="' + cmd + '"]', barre);
    if (!btn) return;
    let actif = false;
    try { actif = document.queryCommandState(cmd); } catch { actif = false; }
    btn.classList.toggle('is-active', actif);
    btn.setAttribute('aria-pressed', String(actif));
  });
}
['keyup', 'mouseup', 'touchend', 'focus'].forEach(evt =>
  editeur.addEventListener(evt, rafraichirEtats)
);

// Collage sans mise en forme parasite
editeur.addEventListener('paste', e => {
  e.preventDefault();
  const texte = (e.clipboardData || window.clipboardData).getData('text/plain');
  document.execCommand('insertText', false, texte);
  publierPlusTard();
});

/* =========================================================
   3) IMAGES — redimensionnées avant stockage
   ========================================================= */

/* Le store passe par localStorage (quelques Mo) : une photo brute d'appareil
   le saturerait à elle seule. On réduit donc chaque image avant publication. */
function redimensionner(fichier, largeurMax, qualite = 0.82) {
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader();
    lecteur.onerror = () => reject(new Error('lecture'));
    lecteur.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('image'));
      img.onload = () => {
        const ratio = Math.min(1, largeurMax / img.width);
        const c = document.createElement('canvas');
        c.width  = Math.round(img.width  * ratio);
        c.height = Math.round(img.height * ratio);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', qualite));
      };
      img.src = lecteur.result;
    };
    lecteur.readAsDataURL(fichier);
  });
}

// Insertion d'une image dans le texte
imgEditeur.addEventListener('change', async e => {
  const fichier = e.target.files[0];
  e.target.value = '';
  if (!fichier) return;
  try {
    const source = await redimensionner(fichier, 1200);
    executer('insertImage', source);
  } catch {
    afficherEtat('Image illisible.', true);
  }
});

/* =========================================================
   4) PHOTOS DU CARROUSEL
   ========================================================= */

ajoutPhotos.addEventListener('change', async e => {
  const fichiers = [...e.target.files];
  e.target.value = '';
  if (!fichiers.length) return;

  afficherEtat('Traitement des photos…');
  const ajoutees = [];
  for (const fichier of fichiers) {
    try { ajoutees.push(await redimensionner(fichier, 1600)); }
    catch { /* fichier illisible : ignoré */ }
  }
  if (!ajoutees.length) { afficherEtat('Aucune photo exploitable.', true); return; }

  const liste = Carrousel.photos.concat(ajoutees);
  Carrousel.definir(liste, liste.length - 1);
  publier({ photos: liste }, ajoutees.length + ' photo(s) publiée(s).');
});

$('#supprPhoto').addEventListener('click', () => {
  if (!Carrousel.photos.length) return;
  if (!confirm('Supprimer cette photo du carrousel ? Elle disparaîtra aussi de la page publique.')) return;

  const liste = Carrousel.photos.slice();
  const pos = Carrousel.index;
  liste.splice(pos, 1);
  Carrousel.definir(liste, Math.max(0, pos - 1));
  publier({ photos: liste }, 'Photo supprimée et publiée.');
});

/* =========================================================
   5) ENREGISTRER / RÉINITIALISER
   ========================================================= */

$('#sauver').addEventListener('click', () => {
  clearTimeout(minuteurPublication);
  if (publier({ presentation: editeur.innerHTML }, 'Contenu publié sur la page publique.')) {
    etatDirect('Publié à l\'instant');
  }
});

$('#reinit').addEventListener('click', () => {
  if (!confirm('Réinitialiser le contenu de la présentation ? Les modifications seront perdues, sur cette page comme sur la page publique.')) return;
  clearTimeout(minuteurPublication);
  editeur.innerHTML = CONTENU_DEFAUT;
  publier({ presentation: null }, 'Contenu réinitialisé.');
  etatDirect('Contenu par défaut');
});

/* Ouvre la page publique dans un onglet à côté, pour voir la synchronisation en direct. */
const lienApercu = $('#apercu');
if (lienApercu) {
  lienApercu.addEventListener('click', () => {
    clearTimeout(minuteurPublication);
    publier({ presentation: editeur.innerHTML });
  });
}

exports.id=8815,exports.ids=[8815],exports.modules={7877:(a,b,c)=>{"use strict";c.d(b,{Eh:()=>f,Qo:()=>e,cx:()=>d});let d=20;function e(a){return Math.round(1.2*a*100)/100}function f(a){return a.toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})+" €"}},29956:(a,b,c)=>{"use strict";function d(a){if(!a||"object"!=typeof a||Array.isArray(a))return null;let b={};for(let[c,d]of Object.entries(a)){let a=String(d??"").trim();a&&(b[c]=a)}return Object.keys(b).length?b:null}function e(a){let b=a.replace(/[_-]+/g," ").replace(/([a-z])([A-Z])/g,"$1 $2").trim();return b.charAt(0).toUpperCase()+b.slice(1)}c.d(b,{T:()=>e,s:()=>d})},39707:(a,b,c)=>{"use strict";c.d(b,{_:()=>f,l:()=>h});var d=c(94723),e=c(7877);if(!process.env.STRIPE_SECRET_KEY)throw Error("STRIPE_SECRET_KEY manquante dans .env");let f=new d.Ay(process.env.STRIPE_SECRET_KEY,{apiVersion:"2026-05-27.dahlia"}),g=null;async function h(){if(g)return g;let a=(await f.taxRates.list({active:!0,limit:100})).data.find(a=>a.percentage===e.cx&&!a.inclusive&&"TVA"===a.display_name),b=a?.id??(await f.taxRates.create({display_name:"TVA",description:`TVA ${e.cx}%`,percentage:e.cx,inclusive:!1,country:"FR"})).id;return g=b,b}},54350:(a,b,c)=>{"use strict";c.d(b,{G:()=>f});var d=c(39707),e=c(89289);async function f(a,b){let c=await d._.invoices.sendInvoice(a),f=(c.total??c.amount_due??0)/100;try{await (0,e.PD)({clientName:b.clientName,kind:b.kind,amountTTC:f,hostedUrl:c.hosted_invoice_url,pdfUrl:c.invoice_pdf})}catch(a){console.error("[invoice-copy] \xe9chec envoi copie admin:",a?.message||a)}return c}},57078:(a,b,c)=>{"use strict";c.d(b,{z:()=>e});var d=c(96330);let e=globalThis.prisma??new d.PrismaClient},78335:()=>{},89289:(a,b,c)=>{"use strict";c.d(b,{H4:()=>p,LK:()=>j,PD:()=>o,SJ:()=>n,l:()=>k,lD:()=>m,q:()=>i});var d=c(35924),e=c(29956);let f=null;function g(){if(f)return f;let a=process.env.SMTP_HOST,b=process.env.SMTP_USER,c=process.env.SMTP_PASS;if(!a||!b||!c)return null;let e=parseInt(process.env.SMTP_PORT||"465",10);return f=d.createTransport({host:a,port:e,secure:465===e,auth:{user:b,pass:c}})}let h=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;function i(a){if(!a)return[];let b=a.trim();if(b.startsWith("["))try{let a=JSON.parse(b);if(Array.isArray(a))return a.map(a=>String(a?.email??"").trim()).filter(a=>h.test(a))}catch{}return b.split(/[,;\n]/).map(a=>a.trim()).filter(a=>h.test(a))}function j(a){let b=[],c=[];if(!a)return{jboost:b,client:c};let d=a.trim();if(d.startsWith("["))try{let a=JSON.parse(d);if(Array.isArray(a)){for(let d of a){let a=String(d?.email??"").trim();if(!h.test(a))continue;let e=String(d?.label??"");/jboost/i.test(e)?b.push(a):c.push(a)}return{jboost:b,client:c}}}catch{}for(let a of d.split(/[,;\n]/).map(a=>a.trim()).filter(a=>h.test(a)))c.push(a);return{jboost:b,client:c}}function k(a){let b=j(a.siteNotifyEmails),c=j(a.clientNotifyEmails),d=a=>[...a.client,...a.jboost];return[...new Set(d(b).length?d(b):d(c).length?d(c):i(a.clientEmail))]}function l(a){return a.replace(/[&<>"]/g,a=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[a])}async function m(a){let b=g();if(!b||0===a.to.length)return!1;let c=process.env.MAIL_FROM||process.env.SMTP_USER,{lead:d}=a,f=`Nouveau lead — ${a.campagneName} (${a.siteName})`,i="#6A4FE6",j=d.phone?String(d.phone).replace(/[^\d+]/g,""):"",k=[d.name?{label:"Nom",text:String(d.name),html:l(String(d.name))}:null,d.email?{label:"Email",text:String(d.email),html:`<a href="mailto:${l(String(d.email))}" style="color:${i};text-decoration:none;font-weight:600">${l(String(d.email))}</a>`}:null,d.phone?{label:"T\xe9l\xe9phone",text:String(d.phone),html:`<a href="tel:${j}" style="color:${i};text-decoration:none;font-weight:600">${l(String(d.phone))}</a>`}:null,d.message?{label:"Message",text:String(d.message),html:l(String(d.message)).replace(/\n/g,"<br>")}:null,d.source?{label:"Source",text:String(d.source),html:l(String(d.source))}:null].filter(a=>null!==a);if(a.extra)for(let[b,c]of Object.entries(a.extra)){let a=String(c??"").trim();a&&k.push({label:(0,e.T)(b),text:a,html:l(a).replace(/\n/g,"<br>")})}let m=(a.note?`${a.note}

`:"")+`Nouveau lead re\xe7u via MonsieurLead

Client : ${a.clientName}
Campagne : ${a.campagneName}
Site : ${a.siteName}

`+k.map(a=>`${a.label} : ${a.text}`).join("\n"),n=(a,b,c)=>`<span style="display:inline-block;background:${b};color:${c};font-weight:600;font-size:12px;padding:3px 10px;border-radius:999px;margin:0 5px 5px 0">${l(a)}</span>`,o=k.map((a,b)=>{let c=b%2?"#FAFAFC":"#FFFFFF";return`<tr>
          <td style="padding:13px 22px;background:${c};border-bottom:1px solid #EEF0F5;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#9296A5;width:120px;vertical-align:top">${a.label}</td>
          <td style="padding:13px 22px;background:${c};border-bottom:1px solid #EEF0F5;font-size:15px;color:#16171D;vertical-align:top;line-height:1.5">${a.html}</td>
        </tr>`}).join(""),p=`
  <div style="background:#F4F5F8;padding:24px 12px;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif">
    <div style="max-width:600px;margin:0 auto">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
        <tr><td style="background:#6A4FE6;border-radius:14px 14px 0 0;padding:22px 24px">
          <div style="color:#FFFFFF;font-size:18px;font-weight:800;letter-spacing:-.01em">MonsieurLead</div>
          <div style="color:#DAD3FB;font-size:13px;margin-top:2px">Nouveau lead re\xe7u 🎉</div>
        </td></tr>
      </table>
      <div style="background:#FFFFFF;border:1px solid #E8E9EF;border-top:0;border-radius:0 0 14px 14px;overflow:hidden">
        <div style="padding:18px 22px 4px">
          ${a.note?`<div style="background:#FEF2F2;border:1px solid #FECACA;color:#B91C1C;padding:11px 14px;border-radius:10px;font-size:13px;line-height:1.5;margin-bottom:14px">${l(a.note)}</div>`:""}
          <div>
            ${n(a.clientName,"#EFEBFD","#6A4FE6")}${n(a.campagneName,"#F1F2F6","#4B4F5C")}${n(a.siteName,"#F1F2F6","#4B4F5C")}
          </div>
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-top:1px solid #EEF0F5;margin-top:8px">
          ${o}
        </table>
        ${d.email?`<div style="padding:18px 22px">
          <a href="mailto:${l(String(d.email))}" style="display:inline-block;background:#6A4FE6;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:14px;padding:11px 22px;border-radius:10px">R\xe9pondre au lead</a>
        </div>`:""}
      </div>
      <p style="color:#9AA0AE;text-align:center;font-size:11.5px;margin:16px 0 0">Transf\xe9r\xe9 automatiquement par MonsieurLead.</p>
    </div>
  </div>`;return await b.sendMail({from:c,to:a.to.join(", "),replyTo:a.replyTo&&h.test(a.replyTo)?a.replyTo:void 0,subject:f,text:m,html:p}),!0}async function n(a){let b=g();if(!b||0===a.to.length)return!1;let c=process.env.MAIL_FROM||process.env.SMTP_USER,d=`Bonjour,

Votre solde pr\xe9pay\xe9 de leads est \xe9puis\xe9 : nous ne vous transmettons plus de nouveaux leads pour le moment.

Pour continuer \xe0 recevoir des leads, vous pouvez recharger votre solde, ou passer \xe0 la facturation mensuelle. Contactez-nous pour choisir la formule qui vous convient.

— MonsieurLead`,e=`
  <div style="background:#F4F5F8;padding:24px 12px;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif">
    <div style="max-width:600px;margin:0 auto">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
        <tr><td style="background:#6A4FE6;border-radius:14px 14px 0 0;padding:22px 24px">
          <div style="color:#FFFFFF;font-size:18px;font-weight:800;letter-spacing:-.01em">MonsieurLead</div>
          <div style="color:#DAD3FB;font-size:13px;margin-top:2px">Solde de leads \xe9puis\xe9</div>
        </td></tr>
      </table>
      <div style="background:#FFFFFF;border:1px solid #E8E9EF;border-top:0;border-radius:0 0 14px 14px;padding:22px 24px">
        <p style="margin:0 0 12px;font-size:15px;color:#16171D;line-height:1.6">Bonjour,</p>
        <div style="background:#FEF2F2;border:1px solid #FECACA;color:#B91C1C;padding:11px 14px;border-radius:10px;font-size:14px;line-height:1.5;margin-bottom:14px">
          Votre solde pr\xe9pay\xe9 de leads est <strong>\xe9puis\xe9</strong> — nous ne vous transmettons plus de nouveaux leads pour le moment.
        </div>
        <p style="margin:0;font-size:14px;color:#414350;line-height:1.6">
          Pour continuer \xe0 recevoir des leads, vous pouvez <strong>recharger votre solde</strong>, ou <strong>passer \xe0 la facturation mensuelle</strong>.
          Contactez-nous pour choisir la formule qui vous convient.
        </p>
      </div>
      <p style="color:#9AA0AE;text-align:center;font-size:11.5px;margin:16px 0 0">MonsieurLead — ${l(a.clientName)}</p>
    </div>
  </div>`;return await b.sendMail({from:c,to:a.to.join(", "),subject:"Votre solde de leads est \xe9puis\xe9 — MonsieurLead",text:d,html:e}),!0}async function o(a){let b=g();if(!b)return!1;let c=process.env.MAIL_FROM||process.env.SMTP_USER,d=i(c);if(0===d.length)return!1;let e=`Copie facture — ${a.clientName} \xb7 ${a.kind}`,f=(a.hostedUrl?`
Facture en ligne : ${a.hostedUrl}`:"")+(a.pdfUrl?`
PDF : ${a.pdfUrl}`:""),h=`Facture \xe9mise \xe0 ${a.clientName}
Type : ${a.kind}
Montant : ${a.amountTTC.toFixed(2)} € TTC${f}`,j=`
    <div style="font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#16171D">
      <p style="margin:0 0 8px">Facture \xe9mise \xe0 <strong>${l(a.clientName)}</strong></p>
      <p style="margin:0 0 4px;color:#414350">Type : ${l(a.kind)}</p>
      <p style="margin:0 0 12px;color:#414350">Montant : <strong>${a.amountTTC.toFixed(2)} € TTC</strong></p>
      ${a.hostedUrl?`<p style="margin:0 0 6px"><a href="${l(a.hostedUrl)}" style="color:#6A4FE6">Voir la facture en ligne</a></p>`:""}
      ${a.pdfUrl?`<p style="margin:0"><a href="${l(a.pdfUrl)}" style="color:#6A4FE6">T\xe9l\xe9charger le PDF</a></p>`:""}
    </div>`;return await b.sendMail({from:c,to:d.join(", "),subject:e,text:h,html:j}),!0}async function p(a){let b=g();if(!b)return!1;let c=process.env.MAIL_FROM||process.env.SMTP_USER,d=a.reset?"R\xe9initialiser mon mot de passe":"D\xe9finir mon mot de passe",e=a.reset?"R\xe9initialisation de votre mot de passe — MonsieurLead":"Cr\xe9ez votre mot de passe — MonsieurLead",f=a.reset?"Vous avez demand\xe9 \xe0 r\xe9initialiser le mot de passe de votre espace client MonsieurLead. Cliquez ci-dessous pour en choisir un nouveau.":"Bienvenue sur votre espace client MonsieurLead. Cliquez ci-dessous pour cr\xe9er votre mot de passe et acc\xe9der \xe0 votre compte.",h=`Bonjour,

${f}

${a.link}

Ce lien est valable 30 minutes et \xe0 usage unique. Si vous n'\xeates pas \xe0 l'origine de cette demande, ignorez cet e-mail.`,i=`
  <div style="background:#F4F5F8;padding:24px 12px;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif">
    <div style="max-width:520px;margin:0 auto">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
        <tr><td style="background:#6A4FE6;border-radius:14px 14px 0 0;padding:22px 24px">
          <div style="color:#FFFFFF;font-size:18px;font-weight:800;letter-spacing:-.01em">MonsieurLead</div>
          <div style="color:#DAD3FB;font-size:13px;margin-top:2px">${a.reset?"R\xe9initialisation du mot de passe":"Cr\xe9ation de votre mot de passe"}</div>
        </td></tr>
      </table>
      <div style="background:#FFFFFF;border:1px solid #E8E9EF;border-top:0;border-radius:0 0 14px 14px;padding:24px">
        <p style="margin:0 0 16px;font-size:15px;color:#16171D;line-height:1.6">Bonjour,</p>
        <p style="margin:0 0 20px;font-size:14px;color:#414350;line-height:1.6">${f}</p>
        <a href="${l(a.link)}" style="display:inline-block;background:#6A4FE6;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:12px">${d}</a>
        <p style="margin:18px 0 0;font-size:13px;color:#787C8A;line-height:1.6">Le bouton ne fonctionne pas ? Copiez ce lien dans votre navigateur :</p>
        <p style="margin:4px 0 0;font-size:13px;line-height:1.5"><a href="${l(a.link)}" style="color:#6A4FE6;word-break:break-all">${l(a.link)}</a></p>
        <p style="margin:18px 0 0;font-size:12px;color:#9AA0AE;line-height:1.6">Ce lien est valable 30 minutes et \xe0 usage unique. Si vous n'\xeates pas \xe0 l'origine de cette demande, ignorez cet e-mail.</p>
      </div>
      <p style="color:#9AA0AE;text-align:center;font-size:11.5px;margin:16px 0 0">MonsieurLead — ${l(a.clientName)}</p>
    </div>
  </div>`;return await b.sendMail({from:c,to:a.to,subject:e,text:h,html:i}),!0}},96487:()=>{}};
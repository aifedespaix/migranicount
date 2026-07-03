// Contenu légal partagé entre les vues Vue (ConfidentialiteView, MentionsLegalesView)
// et le script de pré-rendu (scripts/prerender.mjs). Modifier ici modifie les deux.

export const confidentialite = {
  title: 'Politique de confidentialité',
  updated: 'Dernière mise à jour : juillet 2026',
  sections: [
    {
      heading: '1. Qui gère cette application ?',
      paragraphs: [
        'Migracount est un projet personnel développé et opéré par <strong>Aife</strong>. Pour toute question relative à vos données, vous pouvez me contacter à <a href="mailto:aife.contacts@gmail.com">aife.contacts@gmail.com</a>.',
      ],
    },
    {
      heading: '2. Quelles données sont concernées ?',
      paragraphs: [
        "Migracount vous permet d'enregistrer des données relatives à vos crises de migraine : date et heure, intensité, durée, localisation, symptômes, déclencheurs et médicaments pris. Ces informations constituent des <strong>données de santé</strong>, une catégorie de données particulière au sens de l'article 9 du RGPD.",
        "Si vous choisissez de vous connecter, votre adresse e-mail et votre nom (fournis par Google lors de la connexion) sont également utilisés pour identifier votre compte.",
      ],
    },
    {
      heading: '3. Fonctionnement par défaut : tout reste sur votre appareil',
      paragraphs: [
        "Par défaut, Migracount ne transmet <strong>aucune donnée</strong> à un serveur. Toutes vos crises sont enregistrées uniquement dans le stockage local de votre navigateur (<code>localStorage</code>), sur l'appareil que vous utilisez. Je n'y ai aucun accès.",
      ],
    },
    {
      heading: '4. Synchronisation optionnelle',
      paragraphs: [
        "Si vous activez la connexion avec votre compte Google, vos données sont alors envoyées et stockées sur un serveur PocketBase que j'héberge moi-même (auto-hébergement personnel). Cette synchronisation est entièrement optionnelle et repose sur votre <strong>consentement explicite</strong> : elle ne s'active que si vous cliquez sur « Se connecter ».",
        "Google intervient uniquement comme fournisseur d'authentification (connexion OAuth2) : seules votre adresse e-mail et votre identité de connexion lui sont transmises. Vos données de santé (crises, symptômes, traitements…) ne sont jamais partagées avec Google ni avec un autre tiers.",
      ],
      list: [
        "Chaque utilisateur n'a accès qu'à ses propres données.",
        'Les échanges avec le serveur sont chiffrés (HTTPS).',
        'Les données restent hébergées en Europe, sur mon infrastructure personnelle.',
        'Vous pouvez vous déconnecter à tout moment ; vos données locales sont conservées.',
      ],
    },
    {
      heading: '5. Cookies et traceurs',
      paragraphs: [
        "Migracount n'utilise <strong>aucun cookie</strong>, aucun outil d'analytics, aucun traceur publicitaire et n'affiche aucune publicité. Le seul stockage utilisé est le <code>localStorage</code> de votre navigateur, strictement nécessaire au fonctionnement de l'application (et, si vous êtes connecté, le maintien de votre session).",
      ],
    },
    {
      heading: '6. Durée de conservation',
      paragraphs: [
        'Vos données sont conservées tant que vous utilisez l\'application ou que votre compte existe. Vous pouvez les supprimer à tout moment, en local (en vidant les données de l\'application dans votre navigateur) ou côté serveur (voir ci-dessous).',
      ],
    },
    {
      heading: '7. Vos droits',
      paragraphs: [
        'Conformément au RGPD, vous disposez des droits suivants sur vos données :',
      ],
      list: [
        '<strong>Accès</strong> : consultez vos données directement dans l\'application.',
        '<strong>Portabilité</strong> : exportez l\'intégralité de vos données au format JSON depuis la page Réglages.',
        '<strong>Effacement</strong> : supprimez définitivement votre compte et toutes les données associées depuis votre page Profil (action irréversible).',
        '<strong>Rectification</strong> : modifiez ou supprimez chaque crise individuellement.',
        '<strong>Opposition / retrait du consentement</strong> : déconnectez-vous à tout moment pour arrêter la synchronisation.',
      ],
      paragraphsAfterList: [
        'Pour toute question ou demande que vous ne pouvez pas effectuer vous-même dans l\'application, contactez-moi à <a href="mailto:aife.contacts@gmail.com">aife.contacts@gmail.com</a>. Vous pouvez également introduire une réclamation auprès de la <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener noreferrer">CNIL</a>.',
      ],
    },
    {
      heading: '8. Modifications',
      paragraphs: [
        'Cette politique peut évoluer avec les fonctionnalités de l\'application. La date de dernière mise à jour figure en haut de cette page.',
      ],
    },
  ],
}

export const mentionsLegales = {
  title: 'Mentions légales',
  sections: [
    {
      heading: 'Éditeur du site',
      paragraphs: [
        'Ce site est édité à titre personnel et non commercial par <strong>Aife</strong>.',
        'Contact : <a href="mailto:aife.contacts@gmail.com">aife.contacts@gmail.com</a>',
        "Migracount est un projet personnel, gratuit et sans but lucratif. Il n'est pas édité dans le cadre d'une activité professionnelle ou commerciale.",
      ],
    },
    {
      heading: 'Hébergement',
      paragraphs: [
        "L'application (front-end) et le serveur de synchronisation (PocketBase) sont <strong>auto-hébergés</strong> sur une infrastructure personnelle par l'éditeur.",
        'Le nom de domaine est enregistré auprès d\'un bureau d\'enregistrement (registrar) tiers.',
      ],
    },
    {
      heading: 'Propriété intellectuelle',
      paragraphs: [
        "Le code source, la charte graphique et les contenus de Migracount sont la propriété de l'éditeur, sauf mention contraire. Toute reproduction sans autorisation est interdite.",
      ],
    },
    {
      heading: 'Responsabilité',
      paragraphs: [
        "Migracount est un outil personnel d'aide au suivi des migraines. Il ne constitue en aucun cas un dispositif médical ni un avis médical. Les informations que vous y enregistrez ne remplacent pas un suivi par un professionnel de santé. En cas de doute sur votre état de santé, consultez un médecin.",
        "L'éditeur met en œuvre des moyens raisonnables pour assurer la disponibilité et la sécurité du service, sans garantie de continuité absolue (service auto-hébergé, à but non commercial).",
      ],
    },
    {
      heading: 'Données personnelles',
      paragraphs: [
        'Le traitement des données personnelles est détaillé dans la <a href="/confidentialite/">politique de confidentialité</a>.',
      ],
    },
  ],
}

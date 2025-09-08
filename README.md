# PGF Artist Website - Frontend

Application Angular moderne pour portfolio d'artiste. Interface responsive présentant œuvres d'art, expositions et informations de contact.

## 🏗️ Architecture

### Stack technique
- **Angular 18** avec Standalone Components
- **TypeScript**
- **Angular Material** - Design system
- **RxJS** - Programmation réactive
- **SSR** activé pour SEO

### Structure du projet

```
src/app/
├── 📁 core/
│   ├── models/                     # Interfaces métier
│   └── services/                   # Services API
├── 📁 shared/
│   └── components/                 # Composants réutilisables
│       ├── artwork-gallery/
│       ├── contact-form/
│       └── loading-spinner/
├── 📁 features/                    # Pages (lazy-loaded)
│   ├── home/                       # Page d'accueil
│   ├── about/                      # Présentation artiste
│   ├── artworks/                   # Galerie œuvres
│   ├── exhibitions/                # Expositions
│   └── contact/                    # Contact
└── 📁 layout/                      # Navigation et footer
```

## 📱 Pages principales

| Section | Description |
|---------|-------------|
| **Accueil** | Hero section + sélection d'œuvres |
| **À propos** | Biographie et démarche artistique |
| **Œuvres** | Galerie organisée par catégories |
| **Expositions** | Historique et événements à venir |
| **Contact** | Formulaire et informations |

## 🔗 Backend Integration

- Communication avec API REST Spring Boot
- Gestion des œuvres, catégories et expositions
- Formulaire de contact avec validation
- Configuration via variables d'environnement

## 🎨 Design System

- **Material Design** avec thème personnalisé
- **Responsive** mobile-first
- **Lazy Loading** pour optimisation des performances
- **Animations** subtiles et transitions fluides

## ⚡ Fonctionnalités

- ✅ **Performance** - OnPush Strategy et lazy loading
- ✅ **SEO** - Rendu côté serveur configuré
- ✅ **PWA** - Cache offline pour meilleure UX
- ✅ **Accessibilité** - Standards WCAG respectés
- ✅ **TypeScript** - Typage strict pour robustesse

---

*Portfolio web moderne pour présentation d'œuvres d'art contemporain*

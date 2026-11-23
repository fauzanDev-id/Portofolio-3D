/**
 * ============================================================================
 * PORTFOLIO CONTENT & DATA CONFIGURATION
 * ============================================================================
 * This file is the SINGLE SOURCE OF TRUTH for all portfolio content.
 * To update your bio, skills, projects, experience, education, or contact
 * links, EDIT THIS FILE ONLY.
 *
 * Each entry in `sections` corresponds to a 3D building POI in the world:
 * - developer-house: About me bio and quick facts
 * - skills: Categorized skills with progress ratings (0-100)
 * - projects: Project showcase with tags, links, and optional images
 * - experience: Work history timeline
 * - education: Academic history and certifications
 * - contact: Direct links and communication channels
 * ============================================================================
 */

export const profile = {
  name: 'Alex Morgan',
  title: 'Full-Stack & Creative 3D Developer',
  tagline: 'Bridging interactive WebGL graphics with resilient cloud architectures',
  avatar: '⚡',
  location: 'San Francisco, CA / Remote',
};

export const sections = {
  'developer-house': {
    id: 'developer-house',
    title: 'Developer House',
    subtitle: 'About Me & Core Engineering Philosophy',
    icon: '🏠',
    type: 'about',
    bio: [
      'Hello and welcome to my 3D interactive hub! I am a full-stack software engineer specializing in interactive WebGL graphics, creative web design, and scalable distributed systems.',
      'With over 6 years of experience across modern web stacks, I enjoy crafting performant digital spaces where mathematics, art, and clean code intersect. I prioritize lightweight bundles, 60+ FPS rendering, and accessible user experiences.',
      'When I am not tweaking shaders or fine-tuning game loops, you can find me contributing to open-source graphics tooling, exploring low-poly voxel art, or hiking coastal trails.',
    ],
    facts: [
      { label: 'Experience', value: '6+ Years' },
      { label: 'Primary Focus', value: 'Three.js, WebGL & Vanilla ES' },
      { label: 'Backend Stack', value: 'Node.js, PostgreSQL, WebSockets' },
      { label: 'Work Preference', value: 'Hybrid / Remote Friendly' },
      { label: 'Languages', value: 'JavaScript, GLSL, Python' },
      { label: 'Passions', value: 'Real-time 3D, Procedural Worlds' },
    ],
  },

  skills: {
    id: 'skills',
    title: 'Skills & Technologies',
    subtitle: 'Languages, Frameworks, Graphics & Tooling',
    icon: '⚡',
    type: 'skills',
    groups: [
      {
        name: '3D & Creative Web',
        items: [
          { name: 'Three.js / WebGL', level: 94 },
          { name: 'GLSL Shaders & Materials', level: 78 },
          { name: 'Blender & Low-Poly Modeling', level: 82 },
          { name: 'HTML5 Canvas 2D API', level: 90 },
          { name: 'InstancedMesh & Batching', level: 88 },
        ],
      },
      {
        name: 'Frontend & Architecture',
        items: [
          { name: 'JavaScript (Modern ESNext)', level: 96 },
          { name: 'HTML5, CSS3 & Responsive Design', level: 92 },
          { name: 'Vite & Modern Bundlers', level: 90 },
          { name: 'Web Accessibility (WCAG / a11y)', level: 86 },
          { name: 'Performance Profiling & DevTools', level: 88 },
        ],
      },
      {
        name: 'Backend & Systems',
        items: [
          { name: 'Node.js & Express / Fastify', level: 86 },
          { name: 'WebSockets & Real-Time Sync', level: 84 },
          { name: 'PostgreSQL, SQLite & Redis', level: 80 },
          { name: 'RESTful API Architecture', level: 90 },
          { name: 'Git, GitHub Actions & CI/CD', level: 88 },
        ],
      },
    ],
  },

  projects: {
    id: 'projects',
    title: 'Featured Projects',
    subtitle: 'Selected Interactive Works & Production Applications',
    icon: '🚀',
    type: 'projects',
    projects: [
      {
        title: '3D Interactive Developer Portfolio',
        description:
          'A lightweight, interactive low-poly island portfolio built with Three.js, vanilla JavaScript, and Vite. Features custom 3D collision, third-person camera rig, and procedural world generation without external physics engines.',
        tech: ['Three.js', 'Vanilla JS', 'Vite', 'CSS3'],
        links: [
          { label: 'GitHub Repository', url: 'https://github.com/fauzanDev-id/Portofolio-3D' },
          { label: 'Live Demo', url: 'https://github.com/fauzanDev-id/Portofolio-3D' },
        ],
      },
      {
        title: 'Procedural Terrain & Voxel Engine',
        description:
          'A real-time WebGL island and voxel heightmap synthesizer utilizing seeded simplex noise, chunk streaming, and custom vertex shaders for stylized water reflections.',
        tech: ['WebGL', 'GLSL', 'Algorithms', 'Vite'],
        links: [
          { label: 'Source Code', url: 'https://github.com' },
        ],
      },
      {
        title: 'Real-Time Collaborative Whiteboard',
        description:
          'A multi-user infinite digital canvas featuring sub-millisecond drawing latency, deterministic state synchronization over WebSockets, and SVG export capabilities.',
        tech: ['Node.js', 'WebSockets', 'HTML Canvas', 'Redis'],
        links: [
          { label: 'Case Study', url: 'https://github.com' },
        ],
      },
    ],
  },

  experience: {
    id: 'experience',
    title: 'Work Experience',
    subtitle: 'Professional Roles & Engineering Milestones',
    icon: '💼',
    type: 'timeline',
    items: [
      {
        title: 'Senior Frontend & Graphics Engineer',
        organization: 'Voxel Horizon Studios',
        period: '2023 — Present',
        description:
          'Spearheaded client-side 3D web initiatives, optimized WebGL render pipelines reducing draw calls by 45%, and architected modular component libraries used across high-traffic browser applications.',
      },
      {
        title: 'Full-Stack Software Engineer',
        organization: 'Nexus Interactive Media',
        period: '2021 — 2023',
        description:
          'Developed real-time WebSocket communication backends and interactive data visualizers. Collaborated closely with 3D artists to integrate lightweight asset pipelines.',
      },
      {
        title: 'Junior Web Developer',
        organization: 'PixelCraft Creative Agency',
        period: '2019 — 2021',
        description:
          'Built accessible, responsive client portals and bespoke interactive microsites. Maintained 99.9% uptime across production CMS deployments.',
      },
    ],
  },

  education: {
    id: 'education',
    title: 'Education & Certifications',
    subtitle: 'Academic Foundations & Continuing Growth',
    icon: '🎓',
    type: 'timeline',
    items: [
      {
        title: 'B.S. in Computer Science',
        organization: 'State Institute of Technology',
        period: '2015 — 2019',
        description:
          'Graduated Magna Cum Laude. Focused on Computer Graphics, Data Structures, Distributed Computing, and Human-Computer Interaction.',
      },
      {
        title: 'Advanced WebGL & Three.js Specialization',
        organization: 'Three.js Creative Community',
        period: '2022',
        description:
          'In-depth study of custom shader development, GLSL lighting algorithms, post-processing pipelines, and GPU memory optimization.',
      },
    ],
  },

  contact: {
    id: 'contact',
    title: 'Contact & Channels',
    subtitle: 'Direct Lines, Socials & Open-Source Repositories',
    icon: '📬',
    type: 'links',
    items: [
      {
        label: 'GitHub',
        url: 'https://github.com/fauzanDev-id',
        icon: '💻',
        description: 'Explore my open-source code repositories, stars, and gists',
      },
      {
        label: 'LinkedIn',
        url: 'https://linkedin.com',
        icon: '👔',
        description: 'Connect professionally and view career endorsements',
      },
      {
        label: 'Email',
        url: 'mailto:alex.developer@example.com',
        icon: '✉️',
        description: 'Send direct project inquiries, technical opportunities, or questions',
      },
      {
        label: 'X (Twitter)',
        url: 'https://x.com',
        icon: '🌐',
        description: 'Follow 3D web experiments and occasional tech threads',
      },
    ],
  },
};

/**
 * Validates portfolio data against active world POIs.
 * In development mode, issues a console warning if a building POI has no matching section.
 * @param {Array<{ id: string }>} worldPOIs
 */
export function validatePortfolio(worldPOIs = []) {
  if (import.meta.env.DEV) {
    for (const poi of worldPOIs) {
      if (!sections[poi.id]) {
        console.warn(
          `[portfolio.js] Warning: World POI "${poi.id}" has no matching section in portfolio.js!`
        );
      }
    }
  }
}

export default { profile, sections, validatePortfolio };

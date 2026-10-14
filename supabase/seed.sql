-- ============================================================
-- OPENLU · Données de démonstration (pour découvrir l app)
-- Exécuté uniquement via `supabase db reset` (seed).
-- ============================================================

-- --- Facultés -------------------------------------------------
insert into public.openlu_facultes (code, nom, description, ordre) values
  ('SEG', 'Sciences Économiques et Gestion des Affaires', 'Administration, gestion, finance et entrepreneurship.', 1),
  ('PSE', 'Psychologie et Sciences de l''Éducation', 'Psychologie clinique, counseling et éducation.', 2),
  ('SAGE', 'Sciences Agronomiques et Gestion de l''Environnement', 'Agronomie, environnement, agro-business et projets ruraux.', 3),
  ('SATS', 'Sciences Appliquées, Technologiques et de la Santé', 'Informatique, chimie, biologie et santé publique.', 4),
  ('EIE', 'École d''Innovation et Entrepreneuriat (Diploma)', 'Diplomas professionnels : management, santé, numérique.', 5)
on conflict (code) do nothing;

-- --- Filières : SEG -------------------------------------------
insert into public.openlu_filieres (faculte_id, code, nom)
select f.id, 'SEG-01', 'Administration des Affaires' from public.openlu_facultes f where f.code = 'SEG'
union all select f.id, 'SEG-02', 'Management du système Informatique' from public.openlu_facultes f where f.code = 'SEG'
union all select f.id, 'SEG-03', 'Management des infrastructures et Réseau Informatique' from public.openlu_facultes f where f.code = 'SEG'
union all select f.id, 'SEG-04', 'Logistique et transport' from public.openlu_facultes f where f.code = 'SEG'
union all select f.id, 'SEG-05', 'Marketing Digital' from public.openlu_facultes f where f.code = 'SEG'
union all select f.id, 'SEG-06', 'Management et Gestion des ressources humaines' from public.openlu_facultes f where f.code = 'SEG'
union all select f.id, 'SEG-07', 'Organisation et Communication d''entreprise' from public.openlu_facultes f where f.code = 'SEG'
union all select f.id, 'SEG-08', 'Finance et comptabilité' from public.openlu_facultes f where f.code = 'SEG'
union all select f.id, 'SEG-09', 'Logistique de santé' from public.openlu_facultes f where f.code = 'SEG'
union all select f.id, 'SEG-10', 'Gestion des archives et administration de bureau' from public.openlu_facultes f where f.code = 'SEG'
union all select f.id, 'SEG-11', 'Gestion des conflits' from public.openlu_facultes f where f.code = 'SEG'
union all select f.id, 'SEG-12', 'Tourisme et gestion hôtelière' from public.openlu_facultes f where f.code = 'SEG'
union all select f.id, 'SEG-13', 'Gestion des institutions et politique de système de Santé' from public.openlu_facultes f where f.code = 'SEG'
union all select f.id, 'SEG-14', 'Gestion de développement communautaire et Sanitaire' from public.openlu_facultes f where f.code = 'SEG'
union all select f.id, 'SEG-15', 'Entrepreneuriat et Gestion d''Innovation' from public.openlu_facultes f where f.code = 'SEG'
union all select f.id, 'SEG-16', 'Gouvernance, Paix et Transformation des Conflits' from public.openlu_facultes f where f.code = 'SEG'
union all select f.id, 'SEG-17', 'Gestion des achats et chaînes d''approvisionnement' from public.openlu_facultes f where f.code = 'SEG'
union all select f.id, 'SEG-18', 'Leadership Organisationnel' from public.openlu_facultes f where f.code = 'SEG'
on conflict (code) do nothing;

-- --- Filières : PSE -------------------------------------------
insert into public.openlu_filieres (faculte_id, code, nom)
select f.id, 'PSE-01', 'Counseling & Psychologie Clinique' from public.openlu_facultes f where f.code = 'PSE'
union all select f.id, 'PSE-02', 'Counseling en addictologie & santé mentale' from public.openlu_facultes f where f.code = 'PSE'
union all select f.id, 'PSE-03', 'Psychologie Clinique & Psychopathologie' from public.openlu_facultes f where f.code = 'PSE'
union all select f.id, 'PSE-04', 'Psychologie sociale & communautaire' from public.openlu_facultes f where f.code = 'PSE'
union all select f.id, 'PSE-05', 'Sciences de l''éducation' from public.openlu_facultes f where f.code = 'PSE'
union all select f.id, 'PSE-06', 'Technologie Éducative' from public.openlu_facultes f where f.code = 'PSE'
union all select f.id, 'PSE-07', 'Curriculum & didactique' from public.openlu_facultes f where f.code = 'PSE'
union all select f.id, 'PSE-08', 'Pédagogie de l''enseignement Maternelle, Primaire et Secondaire' from public.openlu_facultes f where f.code = 'PSE'
union all select f.id, 'PSE-09', 'Administration & leadership éducatif' from public.openlu_facultes f where f.code = 'PSE'
union all select f.id, 'PSE-10', 'Éducation sociale' from public.openlu_facultes f where f.code = 'PSE'
on conflict (code) do nothing;

-- --- Filières : SAGE ------------------------------------------
insert into public.openlu_filieres (faculte_id, code, nom)
select f.id, 'SAGE-01', 'Sciences du sol et production végétale' from public.openlu_facultes f where f.code = 'SAGE'
union all select f.id, 'SAGE-02', 'Chimie Bio-Industrie' from public.openlu_facultes f where f.code = 'SAGE'
union all select f.id, 'SAGE-03', 'Gestion de Biodiversité, gestion de sol, eau et Assainissement' from public.openlu_facultes f where f.code = 'SAGE'
union all select f.id, 'SAGE-04', 'Technologie post-production agricole' from public.openlu_facultes f where f.code = 'SAGE'
union all select f.id, 'SAGE-05', 'Agroécologie' from public.openlu_facultes f where f.code = 'SAGE'
union all select f.id, 'SAGE-06', 'Gestion des ressources naturelles et Environnementale' from public.openlu_facultes f where f.code = 'SAGE'
union all select f.id, 'SAGE-07', 'Gestion durable et de ressource renouvelable' from public.openlu_facultes f where f.code = 'SAGE'
union all select f.id, 'SAGE-08', 'Gestion de catastrophe et développement durable' from public.openlu_facultes f where f.code = 'SAGE'
union all select f.id, 'SAGE-09', 'Agro-Business' from public.openlu_facultes f where f.code = 'SAGE'
union all select f.id, 'SAGE-10', 'Gestion des projets et développement rural' from public.openlu_facultes f where f.code = 'SAGE'
on conflict (code) do nothing;

-- --- Filières : SATS ------------------------------------------
insert into public.openlu_filieres (faculte_id, code, nom)
select f.id, 'SATS-01', 'Chimie appliquée et Biologie' from public.openlu_facultes f where f.code = 'SATS'
union all select f.id, 'SATS-02', 'Informatique' from public.openlu_facultes f where f.code = 'SATS'
union all select f.id, 'SATS-03', 'Ingénierie informatique' from public.openlu_facultes f where f.code = 'SATS'
union all select f.id, 'SATS-04', 'Informatique Biomédicale et de Santé' from public.openlu_facultes f where f.code = 'SATS'
union all select f.id, 'SATS-05', 'Sciences et Analyse des données' from public.openlu_facultes f where f.code = 'SATS'
union all select f.id, 'SATS-06', 'Mathématique informatique' from public.openlu_facultes f where f.code = 'SATS'
union all select f.id, 'SATS-07', 'Santé Publique' from public.openlu_facultes f where f.code = 'SATS'
union all select f.id, 'SATS-08', 'Nutrition et santé communautaire' from public.openlu_facultes f where f.code = 'SATS'
union all select f.id, 'SATS-09', 'Épidémiologie et contrôle des maladies' from public.openlu_facultes f where f.code = 'SATS'
union all select f.id, 'SATS-10', 'Bio-statique et Santé Numérique' from public.openlu_facultes f where f.code = 'SATS'
union all select f.id, 'SATS-11', 'Santé Environnementale et Hygiène' from public.openlu_facultes f where f.code = 'SATS'
union all select f.id, 'SATS-12', 'Promotion de la Santé et Prévention' from public.openlu_facultes f where f.code = 'SATS'
union all select f.id, 'SATS-13', 'Santé Maternelle, Néonatale et Infantile' from public.openlu_facultes f where f.code = 'SATS'
union all select f.id, 'SATS-14', 'Santé infirmière et médecine familiale' from public.openlu_facultes f where f.code = 'SATS'
union all select f.id, 'SATS-15', 'Innovation et technologie alimentaire' from public.openlu_facultes f where f.code = 'SATS'
on conflict (code) do nothing;

-- --- Filières : EIE -------------------------------------------
insert into public.openlu_filieres (faculte_id, code, nom)
select f.id, 'EIE-01', 'Système Informatique et entrepreneuriat' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-02', 'Gestion Informatique et Réseaux' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-03', 'Analyse des données & Business Intelligence' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-04', 'Réseaux, IoT & maintenance systems' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-05', 'Développement web & mobile' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-06', 'Management des affaires & Entrepreneuriat' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-07', 'Entrepreneuriat social & innovation frugale' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-08', 'Gestion de projet' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-09', 'Gestion des urgences & sécurité' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-10', 'Informatique de santé & télémédecine' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-11', 'Nutrition & santé communautaire' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-12', 'Counseling & accompagnement psychosocial' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-13', 'Agro-transformation & agriculture intelligente' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-14', 'Logistique & supply chain' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-15', 'Conception pédagogique digitale & e-Learning' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-16', 'Leadership éducatif & administration scolaire' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-17', 'Agro-entrepreneuriat & Chaînes de valeur' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-18', 'Sécurité Alimentaire, Nutrition' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-19', 'Diplomatie Économique & Coopération Transfrontalière' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-20', 'Bonne Gouvernance, Intégrité & Gestion Publique' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-21', 'Gestion des Conflits, Médiation & Consolidation de la Paix' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-22', 'Action Humanitaire, Protection & Gestion des Urgences' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-23', 'Décentralisation, Politiques Publiques & Management Territorial' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-24', 'Agro-transformation & packaging' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-25', 'Finance agricole & gestion coopérative' from public.openlu_facultes f where f.code = 'EIE'
on conflict (code) do nothing;

-- --- Cours de démonstration ------------------------------------
insert into public.openlu_cours (code, titre, description, credits, semestre) values
  ('ALGO1', 'Algorithmique et Programmation 1', 'Bases de l algorithmique et du langage C.', 6, 1),
  ('DB1', 'Bases de Données', 'Modélisation relationnelle et SQL.', 6, 1),
  ('WEB1', 'Développement Web', 'HTML/CSS, JavaScript et frameworks modernes.', 6, 2),
  ('RES1', 'Réseaux de Communication', 'Architecture OSI/TCP/IP, routage.', 6, 2)
on conflict (code) do nothing;
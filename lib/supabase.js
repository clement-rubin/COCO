import { createClient } from '@supabase/supabase-js';

// Création d'un client Supabase singleton
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Les variables d\'environnement Supabase ne sont pas définies');
}

// Créer un client Supabase et l'exporter
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

// Fonction utilitaire pour initialiser la table si nécessaire
export async function initializeRecipesTable() {
  // Vérifier si la table contient déjà des recettes
  const { data: existingRecipes, error: queryError } = await supabase
    .from('recipes')
    .select('id')
    .limit(1);
    
  if (queryError) {
    console.error('Erreur lors de la vérification de la table recettes:', queryError);
    return;
  }
  
  // Si pas de recettes, ajouter quelques recettes d'exemple
  if (!existingRecipes || existingRecipes.length === 0) {
    const initialRecipes = [
      {
        id: "101",
        title: "Crêpes traditionnelles",
        description: "Recette facile de crêpes légères et délicieuses",
        image: "https://images.unsplash.com/photo-1519676867240-f03562e64548?ixlib=rb-4.0.3",
        prepTime: "10 min",
        cookTime: "20 min",
        category: "Dessert",
        author: "Marie Dupont",
        created_at: new Date().toISOString()
      },
      {
        id: "102", 
        title: "Lasagnes végétariennes",
        description: "Version végétarienne riche en légumes et en saveurs",
        image: "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?ixlib=rb-4.0.3",
        prepTime: "30 min",
        cookTime: "45 min",
        category: "Plat principal",
        author: "Thomas Martin",
        created_at: new Date().toISOString()
      }
    ];
    
    const { error: insertError } = await supabase
      .from('recipes')
      .insert(initialRecipes);
      
    if (insertError) {
      console.error('Erreur lors de l\'initialisation des recettes:', insertError);
    } else {
      console.log('Table recettes initialisée avec les données par défaut');
    }
  }
}

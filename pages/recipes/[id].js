import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import styles from '../../styles/RecipeDetail.module.css'

// Sample recipe data - in a real app, this would come from an API or database
const recipesData = {
  '1': {
    id: 1,
    title: "Tarte aux pommes traditionnelle",
    description: "Une délicieuse tarte aux pommes à la française",
    image: "https://images.unsplash.com/photo-1568571780765-9276107cecf3?ixlib=rb-4.0.3",
    prepTime: "30 min",
    cookTime: "45 min",
    servings: 8,
    difficulty: "Moyenne",
    ingredients: [
      "1 pâte brisée",
      "6 pommes Golden",
      "100g de sucre",
      "50g de beurre",
      "1 cuillère à café de cannelle",
      "1 œuf pour dorer"
    ],
    instructions: [
      "Préchauffez le four à 180°C.",
      "Étalez la pâte brisée dans un moule à tarte.",
      "Épluchez et coupez les pommes en fines tranches.",
      "Disposez les tranches de pommes sur la pâte.",
      "Mélangez le sucre et la cannelle, puis saupoudrez sur les pommes.",
      "Ajoutez des petits morceaux de beurre sur le dessus.",
      "Dorez les bords de la tarte avec l'œuf battu.",
      "Enfournez pour 45 minutes jusqu'à ce que la tarte soit dorée."
    ]
  },
  '2': {
    id: 2,
    title: "Poulet rôti aux herbes",
    description: "Poulet rôti juteux avec herbes fraîches",
    image: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?ixlib=rb-4.0.3",
    prepTime: "15 min",
    cookTime: "1h30",
    servings: 4,
    difficulty: "Facile",
    ingredients: [
      "1 poulet entier de 1,5kg",
      "3 gousses d'ail",
      "2 branches de thym frais",
      "2 branches de romarin",
      "50g de beurre mou",
      "Sel et poivre",
      "2 citrons",
      "2 cuillères à soupe d'huile d'olive"
    ],
    instructions: [
      "Préchauffez le four à 190°C.",
      "Mélangez le beurre mou avec l'ail écrasé, le thym et le romarin hachés.",
      "Glissez ce mélange sous la peau du poulet.",
      "Salez et poivrez l'intérieur et l'extérieur du poulet.",
      "Placez les citrons coupés en deux à l'intérieur du poulet.",
      "Badigeonnez le poulet d'huile d'olive.",
      "Enfournez pour 1h30, en arrosant régulièrement avec le jus de cuisson.",
      "Laissez reposer 10 minutes avant de découper."
    ]
  },
  '3': {
    id: 3,
    title: "Pasta Carbonara",
    description: "La vraie recette italienne de carbonara",
    image: "https://images.unsplash.com/photo-1612874742237-6526221588e3?ixlib=rb-4.0.3",
    prepTime: "10 min",
    cookTime: "15 min",
    servings: 4,
    difficulty: "Facile",
    ingredients: [
      "400g de spaghetti",
      "150g de guanciale ou pancetta",
      "3 œufs",
      "100g de pecorino romano râpé",
      "Poivre noir fraîchement moulu",
      "Sel"
    ],
    instructions: [
      "Faites cuire les pâtes dans une grande casserole d'eau salée selon les instructions du paquet.",
      "Pendant ce temps, coupez le guanciale en petits lardons et faites-les revenir à sec dans une poêle jusqu'à ce qu'ils soient croustillants.",
      "Dans un bol, battez les œufs avec le fromage râpé et une bonne quantité de poivre noir.",
      "Égouttez les pâtes en conservant un peu d'eau de cuisson.",
      "Hors du feu, versez les pâtes dans la poêle avec le guanciale.",
      "Ajoutez immédiatement le mélange d'œufs et de fromage, en remuant vigoureusement.",
      "Ajoutez un peu d'eau de cuisson si nécessaire pour créer une sauce crémeuse.",
      "Servez immédiatement avec du poivre noir fraîchement moulu et du pecorino supplémentaire."
    ]
  },
  '4': {
    id: 4,
    title: "Salade niçoise",
    description: "Salade fraîche et colorée du sud de la France",
    image: "https://images.unsplash.com/photo-1608032364895-84c5d3c98c6a?ixlib=rb-4.0.3",
    prepTime: "20 min",
    cookTime: "0 min",
    servings: 4,
    difficulty: "Facile",
    ingredients: [
      "400g de tomates",
      "1 poivron vert",
      "1 concombre",
      "1 oignon rouge",
      "200g de thon en conserve",
      "100g d'olives noires",
      "3 œufs durs",
      "200g de haricots verts",
      "4 filets d'anchois (optionnel)",
      "Huile d'olive",
      "Vinaigre de vin",
      "Sel et poivre"
    ],
    instructions: [
      "Lavez les légumes et coupez les tomates en quartiers, le concombre en rondelles, le poivron en lanières et émincez l'oignon.",
      "Faites cuire les haricots verts 5 minutes dans l'eau bouillante, puis rafraîchissez-les dans l'eau froide.",
      "Faites cuire les œufs durs (10 minutes dans l'eau bouillante), puis écalez-les et coupez-les en quartiers.",
      "Dans un grand saladier, mélangez les légumes préparés.",
      "Ajoutez le thon égoutté et émietté, les olives noires et les filets d'anchois.",
      "Disposez les œufs durs sur le dessus.",
      "Assaisonnez avec une vinaigrette à base d'huile d'olive, de vinaigre, de sel et de poivre.",
      "Servez frais."
    ]
  }
};

export default function RecipeDetail() {
  const router = useRouter()
  const { id } = router.query
  
  // Handle loading state or invalid recipe
  if (router.isFallback || !id) {
    return <div className={styles.loading}>Chargement...</div>
  }
  
  const recipe = recipesData[id]
  
  if (!recipe) {
    return (
      <div className={styles.error}>
        <p>Recette non trouvée</p>
        <Link href="/recipes" className="button">
          Retour aux recettes
        </Link>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>{recipe.title} | COCO - Cuisine & Saveurs</title>
        <meta name="description" content={recipe.description} />
      </Head>

      <div className={styles.recipeHeader}>
        <div className={styles.imageContainer}>
          <Image 
            src={recipe.image} 
            alt={recipe.title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            priority={true}
            className={styles.recipeImage}
          />
        </div>
        <div className={styles.recipeInfo}>
          <h1>{recipe.title}</h1>
          <p className={styles.description}>{recipe.description}</p>
          
          <div className={styles.metaInfo}>
            <div>
              <strong>Préparation:</strong> {recipe.prepTime}
            </div>
            <div>
              <strong>Cuisson:</strong> {recipe.cookTime}
            </div>
            <div>
              <strong>Portions:</strong> {recipe.servings}
            </div>
            <div>
              <strong>Difficulté:</strong> {recipe.difficulty}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.recipeContent}>
        <div className={styles.ingredients}>
          <h2>Ingrédients</h2>
          <ul>
            {recipe.ingredients.map((ingredient, index) => (
              <li key={index}>{ingredient}</li>
            ))}
          </ul>
        </div>
        
        <div className={styles.instructions}>
          <h2>Préparation</h2>
          <ol>
            {recipe.instructions.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}

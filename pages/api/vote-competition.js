import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { competitionId, entryId, userId } = req.body

    // Validation des paramètres
    if (!competitionId || !entryId || !userId) {
      return res.status(400).json({ 
        error: 'Paramètres manquants',
        details: 'competitionId, entryId et userId sont requis'
      })
    }

    // Vérifier si l'utilisateur a déjà voté
    const { data: existingVotes, error: checkError } = await supabase
      .from('competition_votes')
      .select('id')
      .eq('competition_id', competitionId)
      .eq('voter_id', userId)
      .limit(1)

    if (checkError) {
      console.error('Error checking existing votes:', checkError)
      return res.status(500).json({ 
        error: 'Erreur lors de la vérification des votes',
        details: checkError.message
      })
    }

    if (existingVotes && existingVotes.length > 0) {
      return res.status(409).json({ 
        error: 'Vote déjà enregistré',
        details: 'Vous avez déjà voté pour cette compétition'
      })
    }

    // Enregistrer le vote
    const { error: voteError } = await supabase
      .from('competition_votes')
      .insert({
        competition_id: competitionId,
        entry_id: entryId,
        voter_id: userId
      })

    if (voteError) {
      console.error('Error inserting vote:', voteError)
      return res.status(500).json({ 
        error: 'Erreur lors de l\'enregistrement du vote',
        details: voteError.message
      })
    }

    // Mettre à jour le compteur
    const { error: updateError } = await supabase
      .from('competition_entries')
      .update({ 
        votes_count: supabase.sql`votes_count + 1`
      })
      .eq('id', entryId)

    if (updateError) {
      console.error('Error updating vote count:', updateError)
      // Le vote a été enregistré mais le compteur n'a pas pu être mis à jour
      // On retourne quand même un succès
    }

    res.status(200).json({ 
      success: true, 
      message: 'Vote enregistré avec succès'
    })

  } catch (error) {
    console.error('Unexpected error in vote-competition API:', error)
    res.status(500).json({ 
      error: 'Erreur serveur inattendue',
      details: error.message
    })
  }
}

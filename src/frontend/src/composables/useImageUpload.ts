import { ref } from 'vue'

/**
 * Composable pour gérer l'upload d'images de manière centralisée
 */
export function useImageUpload() {
  const imageFile = ref<File | null>(null)
  const imagePreview = ref<string>('')
  
  /**
   * Gère le changement de fichier image
   */
  const handleImageChange = (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (file) {
      // Vérification du type de fichier
      if (!file.type.startsWith('image/')) {
        console.error('Le fichier sélectionné n\'est pas une image')
        return
      }
      
      // Vérification de la taille (max 5MB)
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) {
        console.error('L\'image est trop volumineuse (max 5MB)')
        return
      }
      
      imageFile.value = file
      
      // Créer l'aperçu
      const reader = new FileReader()
      reader.onload = (e) => {
        imagePreview.value = e.target?.result as string
      }
      reader.readAsDataURL(file)
    }
  }

  /**
   * Supprime l'image sélectionnée
   */
  const removeImage = (inputRef?: HTMLInputElement) => {
    imageFile.value = null
    imagePreview.value = ''
    if (inputRef) {
      inputRef.value = ''
    }
  }

  /**
   * Définit une image d'aperçu à partir d'une URL (pour l'édition)
   */
  const setImagePreview = (imageUrl: string) => {
    imagePreview.value = imageUrl
  }

  /**
   * Ajoute l'image à un FormData
   */
  const appendImageToFormData = (formData: FormData, fieldName = 'image') => {
    if (imageFile.value) {
      formData.append(fieldName, imageFile.value)
    }
  }

  /**
   * Remet à zéro l'état de l'upload
   */
  const resetUpload = () => {
    imageFile.value = null
    imagePreview.value = ''
  }

  return {
    imageFile,
    imagePreview,
    handleImageChange,
    removeImage,
    setImagePreview,
    appendImageToFormData,
    resetUpload
  }
}
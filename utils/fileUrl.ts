export function getFileUrl(path: string | null) {
    if (!path) return '#'
    
    // Добавляем префикс папки из public, убирая лишние слэши для безопасности
    const cleanPath = path.startsWith('/') ? path.slice(1) : path
    return `/files/${cleanPath}`

}
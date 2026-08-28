function requireEnv(key:string):string{
    const value = import.meta.env[key]
    if(!value) throw new Error(`Missing required environment variable: ${key}`)
    return value
}

export const env = {
    apiUrl: requireEnv('VITE_API_URL')
}
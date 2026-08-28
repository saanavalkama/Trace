import { useState } from "react"
import { Navigate, useLocation, useNavigate } from "react-router-dom"
import { useVerifyCode } from "../hooks/mutations/authMutationHooks"
import { useAuthStore } from "../store/authStore"

export default function VerifyCodePage(){
    const location = useLocation()
    const navigate = useNavigate()
    const email = (location.state as {email?:string} | null)?.email

    const [code, setCode] = useState('')
    const {mutate:verifyCode, isPending, isError} = useVerifyCode()
    const setAuth = useAuthStore((state) => state.setAuth)

    if(!email){
        return <Navigate to="/login" replace />
    }

    function handleSubmit(e:React.FormEvent<HTMLFormElement>){
        e.preventDefault()
        if(!email) return
        verifyCode({email, code},{
            onSuccess:(data)=>{
                setAuth(data.accessToken, data.user)
                navigate('/')
            }
        })
    }

    return(
        <div>
          <h2>Check your email</h2>
          <p>Enter the code we sent to {email} to finish logging in.</p>
          {isError && <p>That code didn't work. Please check it and try again.</p>}
          <form onSubmit={handleSubmit}>
            <label htmlFor="code">Code</label>
            <input
               id="code"
               value={code}
               onChange={(e)=>setCode(e.target.value)}
               type='text'
               inputMode='numeric'
               autoComplete='one-time-code'
               required
               disabled={isPending}
            />
            <button disabled={isPending}>{isPending ? 'Verifying...' : 'Verify Code'}</button>
          </form>
          <button type="button" onClick={()=>navigate('/login')}>Use a different email</button>
        </div>

    )
}

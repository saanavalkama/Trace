import { useState } from "react"
import { useRequestCode } from "../hooks/mutations/authMutationHooks"
import { useNavigate } from "react-router-dom"

export default function LoginPage(){
    const [email, setEmail] = useState('')
    const {mutate:requestCode, isPending, isError} = useRequestCode()
    const navigate = useNavigate()

    function handleSubmit(e:React.FormEvent<HTMLFormElement>){
        e.preventDefault()
        requestCode(email,{
            onSuccess:()=>navigate('/verifyCode', {state:{email}})
        })
    }

    return(
        <div>
          <h2>Log in</h2>
          <p>Enter your email and we'll send you a one-time code to log in.
             Workspace invites can only be accepted using the email address they were sent to.</p>
          {isError && <p>We couldn't send the code. Please check your email address and try again.</p>}
          <form onSubmit={handleSubmit}>
            <label htmlFor="email">Email</label>
            <input
               id="email"
               value={email}
               onChange={(e)=>setEmail(e.target.value)}
               type='email'
               required
               disabled={isPending}
            />
            <button disabled={isPending}>{isPending ? 'Sending code...' : 'Request Code'}</button>
          </form>
        </div>

    )
}
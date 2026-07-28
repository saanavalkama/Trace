import {Resend} from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export const emailSender = {
    
    sendOtpEmail:async(email:string, code:string)=>{
        const {data, error} = await resend.emails.send({
            from:'jalkiapp@outlook.com',
            to:email,
            subject: 'Your login code',
            text: `Your code is ${code}. It expires in 5 minutes.`,
        })
        if(error){
            throw new Error(`Failed to send OTP email: ${error.message}`)
        }
        return data
    }
}
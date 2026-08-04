import {Resend} from 'resend'
import { env } from '../config/env'

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
    },

    async sendInviteEmail(email: string, workspaceName: string, token: string) {
        const link = `${env.frontendUrl}/invite/accept?token=${token}`

        const { error } = await resend.emails.send({
            from: 'jalkiapp@outlook.com', // or onboarding@resend.dev for now
            to: email,
        subject: `You've been invited to join ${workspaceName}`,
        text: `You've been invited to join ${workspaceName}. Click here to accept: ${link}`,
        })

        if (error) {
            throw new Error(`Failed to send invite email: ${error.message}`)
        }
    }
}
import { PrismaClient } from "../../generated/prisma/client";
import { IssueEvent, StoredEvent } from "./issue-events";

export async function projectIssueEvent(prisma: PrismaClient, stored: StoredEvent){
    const event = {type:stored.type, payload:stored.payload} as IssueEvent
    const issueId = stored.aggregateId

    switch(event.type){
        case 'IssueCreated':
            await prisma.issueBoardProjection.create({
                data:{
                    issueId,
                    workspaceId: event.payload.workspaceId,
                    title: event.payload.title,
                    status: 'open',
                    assigneeIds:[],
                    labels:[]
                }
            })
            break
            
        case 'StatusChanged':
            await prisma.issueBoardProjection.update({
                where:{issueId},
                data:{
                    status:event.payload.to
                }
            })
            break

        case "Assigned":
            await prisma.issueBoardProjection.update({
                where:{issueId},
                data:{
                    assigneeIds:{push:event.payload.userId}
                }
            })
            break
        case "Unassigned":
            const current = await prisma.issueBoardProjection.findUniqueOrThrow({where: {issueId}})
            await prisma.issueBoardProjection.update({
                where:{issueId},
                data: {
                    assigneeIds: current.assigneeIds.filter(id => id !== event.payload.userId)
                }
            })
            break
        case "Commented":
          break
        case "LabelAdded":
            await prisma.issueBoardProjection.update({
                where:{issueId},
                data:{
                    labels: {push:event.payload.label}
                }
            })
            break
        case "Linked":
            break
        case "Closed":
            await prisma.issueBoardProjection.update({
                where:{issueId},
                data:{
                    status:'closed',
                    closed:true
                }
            })
            break
        case "Reopened":
            await prisma.issueBoardProjection.update({
                where:{issueId},
                data:{
                    status:'open',
                    closed:false
                }
            })
            break
        case "MovedToSprint":
            await prisma.issueBoardProjection.update({
                where:{issueId},
                data:{sprintId: event.payload.sprintId}
            })
            break
           
    }

    
}
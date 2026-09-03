import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import { CalendarIcon, Loader2 } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import { useCreateSprint } from "../hooks/sprintMutationHooks"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

const createSprintSchema = z
    .object({
        name: z
            .string()
            .min(2, "Name must be at least 2 characters long")
            .max(100, "Name must be at most 100 characters"),
        startDate: z.date({ error: "Start date is required" }),
        endDate: z.date({ error: "End date is required" }),
    })
    .refine((data) => data.endDate > data.startDate, {
        message: "End date must be after start date",
        path: ["endDate"],
    })

type CreateSprintFormValues = z.infer<typeof createSprintSchema>

export default function CreateSprintForm(){
    const { workspaceId } = useParams<{ workspaceId: string }>()
    const navigate = useNavigate()
    const { mutate, isPending, isError } = useCreateSprint()

    const {
        register,
        handleSubmit,
        control,
        watch,
        formState: { errors },
    } = useForm<CreateSprintFormValues>({
        resolver: zodResolver(createSprintSchema),
    })

    const startDate = watch("startDate")

    function onSubmit(values: CreateSprintFormValues){
        mutate(
            {
                workspaceId: workspaceId!,
                name: values.name,
                startDate: values.startDate.toISOString(),
                endDate: values.endDate.toISOString(),
            },
            {
                onSuccess: (sprint) => {
                    navigate(`/workspaces/${workspaceId}/sprints/${sprint.id}`)
                },
            }
        )
    }

    return (
        <div className="flex min-h-svh items-center justify-center px-4 py-12">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle className="text-xl">Create a sprint</CardTitle>
                    <CardDescription>Set a name and timeframe to start planning work.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <CardContent className="flex flex-col gap-6">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="name">Sprint name</Label>
                            <Input id="name" placeholder="Sprint 1" {...register("name")} />
                            {errors.name && (
                                <p className="text-sm text-destructive">{errors.name.message}</p>
                            )}
                        </div>

                        <div className="flex gap-4">
                            <div className="flex flex-1 flex-col gap-2">
                                <Label htmlFor="startDate">Start date</Label>
                                <Controller
                                    control={control}
                                    name="startDate"
                                    render={({ field }) => (
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    id="startDate"
                                                    type="button"
                                                    variant="outline"
                                                    className={cn(
                                                        "justify-start text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon />
                                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    autoFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    )}
                                />
                                {errors.startDate && (
                                    <p className="text-sm text-destructive">{errors.startDate.message}</p>
                                )}
                            </div>

                            <div className="flex flex-1 flex-col gap-2">
                                <Label htmlFor="endDate">End date</Label>
                                <Controller
                                    control={control}
                                    name="endDate"
                                    render={({ field }) => (
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    id="endDate"
                                                    type="button"
                                                    variant="outline"
                                                    className={cn(
                                                        "justify-start text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon />
                                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    disabled={startDate ? { before: startDate } : undefined}
                                                    autoFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    )}
                                />
                                {errors.endDate && (
                                    <p className="text-sm text-destructive">{errors.endDate.message}</p>
                                )}
                            </div>
                        </div>

                        {isError && (
                            <p className="text-sm text-destructive">
                                Something went wrong creating your sprint. Please try again.
                            </p>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" disabled={isPending}>
                            {isPending && <Loader2 className="animate-spin" />}
                            {isPending ? "Creating sprint..." : "Create sprint"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}

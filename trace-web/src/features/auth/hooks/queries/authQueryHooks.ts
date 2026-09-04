import { useQuery } from "@tanstack/react-query"
import { authService } from "../../api/authService"

export const useMe = () => {
    return useQuery({
        queryKey: ['me'],
        queryFn: () => authService.getMe()
    })
}

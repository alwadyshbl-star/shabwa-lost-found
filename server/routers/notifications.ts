import { z } from "zod";
import * as db from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const notificationRouter = router({
  mine: protectedProcedure.query(({ ctx }) => db.listNotificationsByUser(ctx.user.id)),
  markRead: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(({ ctx, input }) => db.markNotificationRead(input.id, ctx.user.id)),
});

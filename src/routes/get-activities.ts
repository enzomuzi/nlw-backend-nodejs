import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { dayjs } from "../lib/dayjs";
import { ClientError } from "../errors/client-error";

export async function getActivities(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    "/trips/:tripId/activities",
    {
      schema: {
        params: z.object({
          tripId: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      const { tripId } = request.params;

      // Verifica se a viagem existe
      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        include: {
          activities: {
            orderBy: {
              occurs_at: "asc",
            },
          },
        },
      });

      if (!trip) {
        return reply.status(404).send({ error: "Trip not found" });
      }

      // Calcula a diferença em dias entre o início e o fim da viagem
      const differenceInDaysBetweenTripStartAndEnd = dayjs(trip.ends_at).diff(
        trip.starts_at,
        "days"
      );

      // Agrupa as atividades por data
      const activities = Array.from({
        length: differenceInDaysBetweenTripStartAndEnd + 1,
      }).map((_, index) => {
        const date = dayjs(trip.starts_at).add(index, "days");

        return {
          date: date.toISOString(), // Garante que a data está no formato ISO
          activities: trip.activities.filter((activity) => {
            return dayjs(activity.occurs_at).isSame(date, "day");
          }),
        };
      });

      return { activities };
    }
  );
}

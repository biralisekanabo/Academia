"use client";

import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  listerNotifications,
  marquerNotificationLue,
  marquerToutesNotificationsLues,
  supprimerNotification,
} from "@/actions/notifications";
import { creerClientNavigateur } from "@/bibliotheque/supabase/client-navigateur";
import type { Notification } from "@/types/database";

const CLE = ["notifications"] as const;

export function useNotifications(utilisateurId: string) {
  const queryClient = useQueryClient();

  const requete = useQuery({
    queryKey: CLE,
    queryFn: () => listerNotifications(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const supabase = creerClientNavigateur();
    const canal = supabase
      .channel("openlu_notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "openlu_notifications",
          filter: `destinataire_id=eq.${utilisateurId}`,
        },
        (charge) => {
          queryClient.setQueryData<Notification[]>(CLE, (anciennes = []) => {
            if (charge.eventType === "INSERT") {
              const nouvelle = charge.new as Notification;
              if (anciennes.some((n) => n.id === nouvelle.id)) return anciennes;
              return [nouvelle, ...anciennes];
            }
            if (charge.eventType === "UPDATE") {
              const maj = charge.new as Notification;
              return anciennes.map((n) => (n.id === maj.id ? maj : n));
            }
            if (charge.eventType === "DELETE") {
              const supprimee = charge.old as Notification;
              return anciennes.filter((n) => n.id !== supprimee.id);
            }
            return anciennes;
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
  }, [utilisateurId, queryClient]);

  const notifications = requete.data ?? [];
  const nonLues = notifications.filter((notification) => !notification.lue).length;

  const marquerLue = useCallback(
    async (id: string) => {
      queryClient.setQueryData<Notification[]>(CLE, (anciennes = []) =>
        anciennes.map((n) => (n.id === id ? { ...n, lue: true } : n))
      );
      await marquerNotificationLue(id);
    },
    [queryClient]
  );

  const toutMarquerLues = useCallback(async () => {
    queryClient.setQueryData<Notification[]>(CLE, (anciennes = []) =>
      anciennes.map((n) => ({ ...n, lue: true }))
    );
    await marquerToutesNotificationsLues();
  }, [queryClient]);

  const supprimer = useCallback(
    async (id: string) => {
      queryClient.setQueryData<Notification[]>(CLE, (anciennes = []) =>
        anciennes.filter((n) => n.id !== id)
      );
      await supprimerNotification(id);
    },
    [queryClient]
  );

  return {
    notifications,
    nonLues,
    chargement: requete.isLoading,
    marquerLue,
    toutMarquerLues,
    supprimer,
    rafraichir: requete.refetch,
  };
}

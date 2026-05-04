import React, { useCallback, useEffect, useState } from "react";
import type { User } from "../types/User";
import { useNavigate } from "react-router-dom";
import MyProducts from "../components/MyProducts";
import { PageHeader } from "../components/PageHeaderProps";
import "../style/ProfilePage.css";
import "../style/LoanPage.css";
import BottomNav from "../components/BottomNav";
import PushNotificationSettings from "../components/PushNotificationSettings";
import { unsubscribeUser } from "../components/usePushNotifications";
import { readStoredJwt } from "../utils/jwtToken";
import {
  type FriendshipDto,
  acceptFriendRequest,
  deleteFriendship,
  fetchFriends,
  fetchPendingFriendRequests,
} from "../utils/friendships";

const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [friends, setFriends] = useState<FriendshipDto[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendshipDto[]>([]);
  const [friendsLoading, setFriendsLoading] = useState<boolean>(true);
  const [friendsError, setFriendsError] = useState<string | null>(null);
  const [friendActionLoadingId, setFriendActionLoadingId] = useState<number | null>(null);
  const [friendActionMessage, setFriendActionMessage] = useState<string | null>(null);

  const navigate = useNavigate();
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const token = readStoredJwt();
    if (!token) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    fetch(`${apiBaseUrl}/api/users/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then((data: User) => {
        setUser(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load profile.");
        setLoading(false);
      });
  }, [apiBaseUrl]);

  const loadFriendships = useCallback(async () => {
    const token = readStoredJwt();
    if (!token) {
      setFriends([]);
      setPendingRequests([]);
      setFriendsError("Not authenticated");
      setFriendsLoading(false);
      return;
    }

    setFriendsLoading(true);
    setFriendsError(null);

    try {
      const [friendsData, pendingData] = await Promise.all([
        fetchFriends(apiBaseUrl, token),
        fetchPendingFriendRequests(apiBaseUrl, token),
      ]);
      setFriends(friendsData);
      setPendingRequests(pendingData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load friendships.";
      setFriendsError(message);
      setFriends([]);
      setPendingRequests([]);
    } finally {
      setFriendsLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    void loadFriendships();
  }, [loadFriendships]);

  const runFriendAction = async (
    friendshipId: number,
    action: "accept" | "remove",
    successMessage: string
  ) => {
    const token = readStoredJwt();
    if (!token) {
      setFriendActionMessage("Not authenticated");
      return;
    }

    setFriendActionLoadingId(friendshipId);
    setFriendActionMessage(null);

    try {
      if (action === "accept") {
        await acceptFriendRequest(apiBaseUrl, token, friendshipId);
      } else {
        await deleteFriendship(apiBaseUrl, token, friendshipId);
      }
      setFriendActionMessage(successMessage);
      await loadFriendships();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Kunne ikke oppdatere venneliste.";
      setFriendActionMessage(message);
    } finally {
      setFriendActionLoadingId(null);
    }
  };

  const handleLogout = async () => {
    try {
      await unsubscribeUser();
    } catch (logoutError) {
      console.warn("Push unsubscribe failed:", logoutError);
    } finally {
      localStorage.removeItem("jwt");
      navigate("/login");
    }
  };

  if (loading) return <p className="profileState">Laster profil...</p>;
  if (error) return <p className="profileState profileError">{error}</p>;
  if (!user) return <p className="profileState">Ingen brukerdata tilgjengelig.</p>;

  return (
    <div className="profilePage">
      <div className="bgGlow" />
      <main className="profileMain">
        <PageHeader title="Profil" subtitle="Din konto" showBack />
        <section className="section card profileCard">
          <div className="profileAvatarWrap">
            <img
              src={`https://i.pravatar.cc/150?u=${user.id}`}
              alt="Profile"
              className="profileAvatar"
            />
            <div className="rolePill">
              <span className="roleIcon">U</span>
              <span className="roleLabel">Bruker</span>
              <span className="roleName">{user.username}</span>
            </div>
          </div>
          <PushNotificationSettings />
        </section>

        <section className="section card profileFriends">
          <div className="sectionTitle">Venner</div>
          {friendsLoading ? (
            <p className="profileFriendsState">Laster venneliste...</p>
          ) : friendsError ? (
            <p className="profileFriendsState profileFriendsError">{friendsError}</p>
          ) : (
            <>
              <div className="profileFriendsSummary">
                <span>{friends.length} venner</span>
                <span>{pendingRequests.length} foresporsler</span>
              </div>

              {pendingRequests.length > 0 ? (
                <div className="profileFriendsBlock">
                  <div className="profileFriendsSubTitle">Innkommende foresporsler</div>
                  <div className="profileFriendsList">
                    {pendingRequests.map((request) => (
                      <div className="profileFriendRow" key={request.friendshipId}>
                        <div className="profileFriendMeta">
                          <div className="profileFriendName">{request.username}</div>
                          <div className="profileFriendStatus">Venter pa svar</div>
                        </div>
                        <div className="profileFriendActions">
                          <button
                            type="button"
                            className="profileFriendBtn profileFriendBtnAccept"
                            disabled={friendActionLoadingId === request.friendshipId}
                            onClick={() => {
                              void runFriendAction(
                                request.friendshipId,
                                "accept",
                                `${request.username} ble lagt til som venn.`
                              );
                            }}
                          >
                            {friendActionLoadingId === request.friendshipId ? "Laster..." : "Godta"}
                          </button>
                          <button
                            type="button"
                            className="profileFriendBtn profileFriendBtnGhost"
                            disabled={friendActionLoadingId === request.friendshipId}
                            onClick={() => {
                              void runFriendAction(
                                request.friendshipId,
                                "remove",
                                `Foresporsel fra ${request.username} ble avslatt.`
                              );
                            }}
                          >
                            Avsla
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="profileFriendsBlock">
                <div className="profileFriendsSubTitle">Dine venner</div>
                {friends.length === 0 ? (
                  <p className="profileFriendsState">Du har ingen venner enda.</p>
                ) : (
                  <div className="profileFriendsList">
                    {friends.map((friend) => (
                      <div className="profileFriendRow" key={friend.friendshipId}>
                        <div className="profileFriendMeta">
                          <div className="profileFriendName">{friend.username}</div>
                          <div className="profileFriendStatus">Status: {friend.status}</div>
                        </div>
                        <button
                          type="button"
                          className="profileFriendBtn profileFriendBtnGhost"
                          disabled={friendActionLoadingId === friend.friendshipId}
                          onClick={() => {
                            void runFriendAction(
                              friend.friendshipId,
                              "remove",
                              `${friend.username} ble fjernet fra vennelisten.`
                            );
                          }}
                        >
                          Fjern
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {friendActionMessage ? (
                <div className="profileFriendsNotice">{friendActionMessage}</div>
              ) : null}
            </>
          )}
        </section>

        <section className="section card profileProducts profileBookings">
          <div className="sectionTitle">Mine produkter</div>
          <MyProducts />
        </section>
        <button onClick={handleLogout} className="profileLogout">
          Logg ut
        </button>
      </main>
      <BottomNav />
    </div>
  );
};

export default ProfilePage;

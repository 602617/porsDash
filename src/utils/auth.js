export const isLoggedIn = () => {
  const token = localStorage.getItem("jwt");
  return !!token;
};


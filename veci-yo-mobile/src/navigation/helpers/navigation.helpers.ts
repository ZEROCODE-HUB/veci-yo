type NavigationLike = {
  navigate: (routeName: string, params?: object) => void;
  getState?: () => {
    index?: number;
    routes?: Array<{ name?: string }>;
    routeNames?: string[];
  };
  getParent?: () => NavigationLike | undefined;
};

export function navigateToRoute(
  navigation: NavigationLike,
  routeName: string,
  params?: object,
) {
  navigation.navigate(routeName, params);
}

export function navigateToActiveTab(
  navigation: NavigationLike,
  screen: string,
  params?: object,
) {
  const tabNames = new Set(["InicioTab", "ViviendaTab", "PerfilTab"]);
  let current: NavigationLike | undefined = navigation;

  while (current) {
    const state = current.getState?.();
    const isTabNavigator = state?.routes?.some((route) =>
      tabNames.has(route.name || ""),
    );

    if (isTabNavigator) {
      const activeRoute = state?.routes?.[state.index ?? 0];

      if (activeRoute?.name) {
        current.navigate(activeRoute.name, {
          screen,
          ...(params ? { params } : {}),
        });
        return;
      }
    }

    current = current.getParent?.();
  }

  navigation.navigate(screen, params);
}

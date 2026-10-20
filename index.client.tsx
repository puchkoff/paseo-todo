import type { PluginClientContext, PluginSidebarItemProps } from "@getpaseo/plugin/client";
import { SidebarRow } from "@getpaseo/plugin/client/ui";
import { TodoScreen } from "./client/todo.tsx";

function TodoItem({ currentScreen, openScreen }: PluginSidebarItemProps) {
  return (
    <SidebarRow
      icon="ListTodo"
      active={currentScreen?.screenId === "todo"}
      onPress={() => openScreen({ screenId: "todo" })}
    />
  );
}

export default function contribute(client: PluginClientContext) {
  client.addScreen({ id: "todo", title: "Todo", Component: TodoScreen });
  client.addSidebarHeaderItem({ id: "todo", title: "Todo", Component: TodoItem });
  return () => {};
}

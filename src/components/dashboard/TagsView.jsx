import React from "react";
import TagList from "./TagList";

export default function TagsView({ settings, defaultTags, onEdit, onDelete }) {
  return (
    <div style={{ width: "100%", margin: "0 auto", padding: 20 }}>
      <TagList
        tags={settings.tags && settings.tags.length > 0 ? settings.tags : defaultTags}
        settings={settings}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}

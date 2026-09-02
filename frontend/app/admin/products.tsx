      });
      setItems((prev) => prev.map((x) => x.product_id === p.product_id ? { ...x, stock: r.stock } : x));
    } catch (e: any) { notify(e?.message || "Stock update failed"); }
  };

  const save = async () => {
    if (!editing) return;
    const payload = {
      name: editing.name.trim(),
      brand: editing.brand.trim(),
      category_id: editing.category_id,
      description: editing.description || "",
      price: Number(editing.price) || 0,
      mrp: Number(editing.mrp) || 0,
      stock: Number(editing.stock) || 0,
      images: editing.images.filter(Boolean),
      tags: editing.tags || [],
      variants: editing.variants || [],
    };
    if (!payload.name || !payload.brand || payload.price <= 0) {
      notify("Name, brand and price are required");
      return;
    }
    try {
      if (editing.product_id) {
        await api(`/admin/products/${editing.product_id}`, {
          method: "PATCH", body: JSON.stringify(payload),
        });
        notify("Updated");
      } else {
        await api("/admin/products", {
          method: "POST", body: JSON.stringify(payload),
        });
        notify("Created");
      }
      setModalOpen(false);
      setEditing(null);
      load();
    } catch (e: any) { notify(e?.message || "Save failed"); }
  };

  if (user?.role !== "admin") {
    return <SafeAreaView style={{ flex: 1 }}><EmptyState title="Admin only" /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={["top", "bottom"]}>
      <AppHeader title="Products" showNotifications={false} showWishlist={false} hPad={spacing.lg} />
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={16} color={colors.onSurfaceMuted} />
          <TextInput
            testID="adminprod-search"
            value={q}
            onChangeText={setQ}
            placeholder="Search by name or brand"
            placeholderTextColor={colors.onSurfaceMuted}
            style={{ flex: 1, color: colors.onSurface, fontSize: 14 }}
            returnKeyType="search"
          />
          {!!q && (
            <Pressable onPress={() => setQ("")} testID="adminprod-search-clear">
              <Ionicons name="close-circle" size={16} color={colors.onSurfaceMuted} />
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(p) => p.product_id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl }}
        ListEmptyComponent={
          <View style={{ paddingTop: spacing.xxl }}>

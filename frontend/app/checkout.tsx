      if (cart.subtotal < c.min_order) { setCouponMsg(`Min order ₹${c.min_order}`); return; }
      const d = c.type === "percent"
        ? Math.min(Math.round(cart.subtotal * c.value / 100), c.max_discount || Infinity)
        : c.value;
      setDiscount(d);
      setCouponMsg(`Coupon applied — you save ₹${d}`);
    } catch { setCouponMsg("Invalid code"); }
  };

  const addAddress = async () => {
    if (!form.full_name || !form.phone || !form.line1 || !form.city || !form.pincode) return;
    await api("/addresses", { method: "POST", body: JSON.stringify({ ...form, is_default: addresses.length === 0 }) });
    setShowAddForm(false);
    setForm({ label: "Home", full_name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" });
    load();
  };

  const place = async () => {
    if (!addr) return;
    setBusy(true);
    try {
      const order = await api<any>("/checkout", {
        method: "POST",
        body: JSON.stringify({ address_id: addr, payment_method: payment, coupon_code: coupon || null, delivery_slot: slot }),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await refreshCart();
      router.replace(`/order/${order.order_id}`);
    } catch (e: any) {
      setCouponMsg(e?.message || "Order failed");
    } finally { setBusy(false); }
  };

  const total = Math.max(0, cart.subtotal + cart.shipping + cart.tax - discount);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={["top", "bottom"]}>
      <AppHeader title="Checkout" showNotifications={false} showWishlist={false} hPad={spacing.lg} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 180, gap: spacing.lg }} keyboardShouldPersistTaps="handled">
          <View style={s.card}>
            <Text style={s.cardTitle}>Delivery address</Text>
            {addresses.map((a) => (
              <Pressable key={a.address_id} testID={`address-${a.address_id}`} onPress={() => setAddr(a.address_id)} style={[s.addr, addr === a.address_id && s.addrActive]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "500" }}>{a.label} • {a.full_name}</Text>
                  <Text style={{ color: colors.onSurfaceMuted, marginTop: 2 }}>{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.pincode}</Text>
                  <Text style={{ color: colors.onSurfaceMuted, fontSize: 12 }}>{a.phone}</Text>
                </View>
                {addr === a.address_id && <Ionicons name="checkmark-circle" size={22} color={colors.brandPrimary} />}
              </Pressable>
            ))}
            {!showAddForm ? (

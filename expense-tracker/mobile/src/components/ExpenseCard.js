import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function ExpenseCard({ expense, onDelete }) {
  return (
    <View style={styles.card}>
      <View style={styles.info}>
        <Text style={styles.title}>{expense.title}</Text>
        <Text style={styles.category}>{expense.category}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>Rs {expense.amount}</Text>
        <Pressable onPress={() => onDelete(expense._id)}>
          <Text style={styles.delete}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
  },
  info: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600' },
  category: { color: '#777', marginTop: 2 },

  right: { alignItems: 'flex-end' },
  amount: { fontSize: 16, fontWeight: 'bold' },
  delete: { color: '#d00', marginTop: 6 },
});
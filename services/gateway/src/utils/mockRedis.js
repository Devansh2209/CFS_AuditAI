/**
 * In-Memory Redis Mock
 * Used for local development when a real Redis instance is not available.
 * Simulates basic Redis commands using JavaScript Map and Set.
 */
class MockRedis {
    constructor() {
        this.store = new Map();
        this.sortedSets = new Map();
        this.lists = new Map();
        console.log('⚠️  Using In-Memory Redis Mock');
    }

    async connect() {
        return true;
    }

    on(event, callback) {
        // No-op
    }

    // Key-Value operations
    async get(key) {
        const item = this.store.get(key);
        if (!item) return null;
        if (item.expiry && Date.now() > item.expiry) {
            this.store.delete(key);
            return null;
        }
        return item.value;
    }

    async set(key, value) {
        this.store.set(key, { value, expiry: null });
        return 'OK';
    }

    async setEx(key, seconds, value) {
        this.store.set(key, {
            value,
            expiry: Date.now() + (seconds * 1000)
        });
        return 'OK';
    }

    async del(key) {
        this.store.delete(key);
        this.sortedSets.delete(key);
        this.lists.delete(key);
        return 1;
    }

    async expire(key, seconds) {
        const item = this.store.get(key);
        if (item) {
            item.expiry = Date.now() + (seconds * 1000);
            return 1;
        }
        // Also handle sorted sets
        const zSet = this.sortedSets.get(key);
        if (zSet) {
            zSet.expiry = Date.now() + (seconds * 1000);
            return 1;
        }
        return 0;
    }

    async ttl(key) {
        const item = this.store.get(key) || this.sortedSets.get(key);
        if (!item || !item.expiry) return -1;
        const remaining = Math.ceil((item.expiry - Date.now()) / 1000);
        return remaining > 0 ? remaining : -2;
    }

    async incr(key) {
        const item = this.store.get(key);
        let val = 0;
        if (item) {
            val = parseInt(item.value) || 0;
        }
        val++;
        this.store.set(key, { value: val.toString(), expiry: item?.expiry });
        return val;
    }

    // Sorted Set operations (ZSET)
    async zAdd(key, member) {
        if (!this.sortedSets.has(key)) {
            this.sortedSets.set(key, { members: [], expiry: null });
        }
        const set = this.sortedSets.get(key);
        // member is { score, value }
        set.members.push(member);
        return 1;
    }

    async zRemRangeByScore(key, min, max) {
        const set = this.sortedSets.get(key);
        if (!set) return 0;

        const initialLength = set.members.length;
        set.members = set.members.filter(m => m.score < min || m.score > max);
        return initialLength - set.members.length;
    }

    async zRange(key, start, stop) {
        const set = this.sortedSets.get(key);
        if (!set) return [];

        // Sort by score
        const sorted = [...set.members].sort((a, b) => a.score - b.score);

        if (stop === -1) {
            return sorted.slice(start).map(m => m.value);
        }
        return sorted.slice(start, stop + 1).map(m => m.value);
    }

    async zCard(key) {
        const set = this.sortedSets.get(key);
        if (!set) return 0;
        return set.members.length;
    }

    // List operations
    async lPush(key, value) {
        if (!this.lists.has(key)) {
            this.lists.set(key, []);
        }
        const list = this.lists.get(key);
        list.unshift(value);
        return list.length;
    }

    async lTrim(key, start, stop) {
        const list = this.lists.get(key);
        if (!list) return 'OK';
        this.lists.set(key, list.slice(start, stop + 1));
        return 'OK';
    }
}

module.exports = new MockRedis();

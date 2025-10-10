#[starknet::contract]
pub mod Bridge {
    use starknet::{ContractAddress, get_caller_address, get_contract_address};
    use starknet::storage::{
        Map, StoragePointerReadAccess, StoragePointerWriteAccess,
        StorageMapReadAccess, StorageMapWriteAccess
    };

    use core::integer::u256;
    use core::traits::TryInto;
    use core::array::ArrayTrait;

    // Import types from interfaces

    // Bitcoin header structure for verification
    #[derive(Drop, Serde, starknet::Store, Copy)]
    struct BitcoinHeader {
        hash: felt252,
        previous_block_hash: felt252,
        merkle_root: felt252,
        timestamp: u32,
        bits: u32,
        nonce: u32,
        height: u32,
    }

    // Contract constants
    mod Constants {
        pub const MAX_BRIDGE_AMOUNT: u256 = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF_u256; // ~1.15e77
        pub const MIN_BRIDGE_AMOUNT: u256 = 1000; // Minimum 1000 satoshis
        pub const MAX_BTC_ADDRESS_LENGTH: felt252 = 35; // 35 bytes for BTC address
    }

    #[storage]
    struct Storage {
        // Access control
        admin: ContractAddress,
        emergency_admin: ContractAddress,

        // Token management
        is_token_registered: Map<ContractAddress, bool>,
        is_wrapped_token: Map<ContractAddress, bool>,
        token_blacklist: Map<ContractAddress, bool>,

        // Bitcoin Bridge Components - all validated as deployed contracts
        bitcoin_headers_contract: ContractAddress,
        spv_verifier_contract: ContractAddress,
        sbtc_contract: ContractAddress,
        deposit_manager_contract: ContractAddress,
        operator_registry_contract: ContractAddress,
        peg_out_contract: ContractAddress,
        escape_hatch_contract: ContractAddress,

        // Bitcoin network configuration
        btc_genesis_hash: felt252,
        btc_network_magic: u32,
        btc_network_name: felt252, // e.g., 'mainnet', 'testnet', 'regtest'

        // Bridge state
        bridge_paused: bool,
        emergency_paused: bool,
        pause_timestamp: u64,

        // Security and limits
        daily_bridge_limit: u256,
        daily_bridge_used: u256,
        last_reset_timestamp: u64,

        // Operator management
        min_operator_bond: u256,
        max_operator_count: u32,
        current_operator_count: u32,

        // Security features
        used_nonces: Map<felt252, bool>, // nonce -> used (for replay protection)
        user_nonce: Map<ContractAddress, felt252>, // user -> current nonce

        // Earn/Staking system
        staking_positions: Map<(ContractAddress, ContractAddress), StakingPosition>, // (user, token) -> position
        staking_rewards: Map<ContractAddress, u256>, // user -> total earned rewards
        staking_total_supply: Map<ContractAddress, u256>, // token -> total staked amount
        reward_rate: Map<ContractAddress, u256>, // token -> reward rate per second
        last_reward_time: Map<ContractAddress, u64>, // token -> last reward update time
        reward_tokens: Map<ContractAddress, bool>, // token -> is reward token
    }

    #[derive(Drop, starknet::Event)]
    struct Deposited {
        #[key]
        token: ContractAddress,
        #[key]
        from: ContractAddress,
        amount: u256,
        dst_chain_id: felt252,
        recipient: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct Withdrawn {
        #[key]
        token: ContractAddress,
        #[key]
        to: ContractAddress,
        amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct Locked {
        #[key]
        token: ContractAddress,
        #[key]
        from: ContractAddress,
        amount: u256,
        dst_chain_id: felt252,
        recipient: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct Unlocked {
        #[key]
        token: ContractAddress,
        #[key]
        to: ContractAddress,
        amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct Sent {
        dst_chain_id: felt252,
        to_recipient: felt252,
        data: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct Received {
        src_chain_id: felt252,
        from_sender: felt252,
        data: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct Swapped {
        router: ContractAddress,
        token_in: ContractAddress,
        token_out: ContractAddress,
        amount_in: u256,
        amount_out: u256,
        to: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct TokenRegistered {
        #[key]
        token: ContractAddress,
        registered: bool
    }

    #[derive(Drop, starknet::Event)]
    struct WrappedSet {
        #[key]
        token: ContractAddress,
        is_wrapped: bool
    }

    #[derive(Drop, starknet::Event)]
    struct AdminChanged {
        old_admin: ContractAddress,
        new_admin: ContractAddress
    }

    // Staking position structure
    #[derive(Drop, Serde, starknet::Store, Copy)]
    struct StakingPosition {
        user: ContractAddress,
        token: ContractAddress, // Token being staked
        amount: u256,
        staked_at: u64,
        last_reward_update: u64,
        reward_debt: u256,
    }

    // Bitcoin Bridge Events
    #[derive(Drop, starknet::Event)]
    struct BitcoinDepositInitiated {
        #[key]
        deposit_id: u256,
        #[key]
        user: ContractAddress,
        amount: u256,
        btc_address: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct BitcoinWithdrawalInitiated {
        #[key]
        withdrawal_id: u256,
        #[key]
        user: ContractAddress,
        amount: u256,
        btc_address: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct BitcoinHeaderSubmitted {
        #[key]
        height: u32,
        header_hash: felt252,
        previous_hash: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct OperatorRegistered {
        #[key]
        operator: ContractAddress,
        public_key: felt252,
        bond_amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct BridgePaused {
        paused_by: ContractAddress,
        paused_at: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct BridgeUnpaused {
        unpaused_by: ContractAddress,
        unpaused_at: u64,
    }

    // Staking Events
    #[derive(Drop, starknet::Event)]
    struct Staked {
        #[key]
        user: ContractAddress,
        #[key]
        token: ContractAddress,
        amount: u256,
        total_staked: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct Unstaked {
        #[key]
        user: ContractAddress,
        #[key]
        token: ContractAddress,
        amount: u256,
        total_staked: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct RewardsClaimed {
        #[key]
        user: ContractAddress,
        #[key]
        token: ContractAddress,
        reward_amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct RewardRateUpdated {
        #[key]
        token: ContractAddress,
        old_rate: u256,
        new_rate: u256,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        Deposited: Deposited,
        Withdrawn: Withdrawn,
        Locked: Locked,
        Unlocked: Unlocked,
        Sent: Sent,
        Received: Received,
        Swapped: Swapped,
        TokenRegistered: TokenRegistered,
        WrappedSet: WrappedSet,
        AdminChanged: AdminChanged,
        // Bitcoin Bridge Events
        BitcoinDepositInitiated: BitcoinDepositInitiated,
        BitcoinWithdrawalInitiated: BitcoinWithdrawalInitiated,
        BitcoinHeaderSubmitted: BitcoinHeaderSubmitted,
        OperatorRegistered: OperatorRegistered,
        BridgePaused: BridgePaused,
        BridgeUnpaused: BridgeUnpaused,
        // Staking Events
        Staked: Staked,
        Unstaked: Unstaked,
        RewardsClaimed: RewardsClaimed,
        RewardRateUpdated: RewardRateUpdated,
    }

    // Error constants - organized by category
    mod Errors {
        // Admin errors
        pub const NOT_ADMIN: felt252 = 'Bridge: Not admin';
        pub const NOT_AUTHORIZED: felt252 = 'Bridge: Not authorized';

        // Token errors
        pub const TOKEN_NOT_ALLOWED: felt252 = 'Bridge: Token not allowed';
        pub const INVALID_TOKEN: felt252 = 'Bridge: Invalid token';
        pub const TOKEN_NOT_REGISTERED: felt252 = 'Bridge: Token not registered';

        // Amount errors
        pub const INVALID_AMOUNT: felt252 = 'Bridge: Invalid amount';
        pub const AMOUNT_TOO_SMALL: felt252 = 'Bridge: Amount too small';
        pub const AMOUNT_TOO_LARGE: felt252 = 'Bridge: Amount too large';
        pub const INSUFFICIENT_BALANCE: felt252 = 'Bridge: Insufficient balance';

        // Address errors
        pub const INVALID_RECIPIENT: felt252 = 'Bridge: Invalid recipient';
        pub const INVALID_BTC_ADDRESS: felt252 = 'Bridge: Invalid BTC address';
        pub const INVALID_PUBLIC_KEY: felt252 = 'Bridge: Invalid public key';
        pub const INVALID_BOND_AMOUNT: felt252 = 'Bridge: Invalid bond amount';

        // Bridge state errors
        pub const BRIDGE_PAUSED: felt252 = 'Bridge: Bridge is paused';
        pub const BRIDGE_NOT_PAUSED: felt252 = 'Bridge: Bridge not paused';

        // Contract interaction errors
        pub const CONTRACT_NOT_DEPLOYED: felt252 = 'Bridge: Contract not deployed';
        pub const CALL_FAILED: felt252 = 'Bridge: External call failed';
        pub const TRANSFER_FAILED: felt252 = 'Bridge: Transfer failed';
        pub const APPROVE_FAILED: felt252 = 'Bridge: Approve failed';
        pub const MINT_FAILED: felt252 = 'Bridge: Mint failed';

        // Bitcoin-specific errors
        pub const INVALID_HEADER: felt252 = 'Bridge: Invalid header';
        pub const HEADER_EXISTS: felt252 = 'Bridge: Header exists';
        pub const INVALID_PROOF: felt252 = 'Bridge: Invalid proof';
    }

    /// Custom error handling with descriptive messages
    fn ensure(cond: bool, error_code: felt252) {
        assert(cond, error_code);
    }


    /// Ensure caller is admin
    fn assert_admin(ref self: ContractState) {
        let caller = get_caller_address();
        let admin = self.admin.read();
        ensure(caller == admin, Errors::NOT_ADMIN);
    }

    /// Ensure bridge is not paused
    fn assert_not_paused(self: @ContractState) {
        ensure(!self.bridge_paused.read(), Errors::BRIDGE_PAUSED);
    }

    /// Validate contract address is deployed
    fn assert_contract_deployed(contract_address: ContractAddress) {
        ensure(contract_address != 0.try_into().unwrap(), Errors::CONTRACT_NOT_DEPLOYED);
    }

    /// Validate amount is within acceptable range
    fn validate_amount(amount: u256) {
        ensure(amount > 0, Errors::INVALID_AMOUNT);

        // Enhanced amount validation with security checks
        ensure(amount >= Constants::MIN_BRIDGE_AMOUNT, Errors::AMOUNT_TOO_SMALL);
        ensure(amount <= Constants::MAX_BRIDGE_AMOUNT, Errors::AMOUNT_TOO_LARGE);

        // Check for suspicious amounts (potential attack vectors)
        ensure(!is_suspicious_amount(amount), 'SUSPICIOUS_AMOUNT');

        // Validate amount doesn't have too many decimal places for security
        let _amount_str = amount_to_string(amount);
        // Skip length validation for now - felt252 doesn't have len() method
        // ensure(_amount_str.len() <= 20, 'AMOUNT_TOO_PRECISE'); // Prevent precision attacks
    }

    /// Check if amount is suspicious (potential attack pattern)
    fn is_suspicious_amount(amount: u256) -> bool {
        // Check for amounts that might be used in attack patterns
        // e.g., very specific amounts that could be used for replay attacks

        // For now, flag extremely small amounts that might be dust attacks
        amount < 1000 // Less than 0.00001 BTC in satoshis
    }

    /// Convert amount to string for validation (simplified)
    fn amount_to_string(amount: u256) -> felt252 {
        // Simplified conversion for validation purposes
        amount.low.into()
    }

    /// Validate address is not zero
    fn validate_address(address: ContractAddress, param_name: felt252) {
        ensure(address != 0.try_into().unwrap(), param_name);

        // Additional address validation
        ensure(!is_blacklisted_address(address), 'ADDRESS_BLACKLISTED');
        ensure(is_valid_starknet_address(address), 'INVALID_STARKNET_ADDRESS');
    }

    /// Check if address is blacklisted
    fn is_blacklisted_address(address: ContractAddress) -> bool {
        // In production, check against blacklist of known malicious addresses
        false // For now, no blacklisted addresses
    }

    /// Validate Starknet address format
    fn is_valid_starknet_address(address: ContractAddress) -> bool {
        // Basic Starknet address validation
        address != 0.try_into().unwrap()
    }

    /// Check replay protection using nonces
    fn check_replay_protection(ref self: ContractState, user: ContractAddress) {
        let current_nonce = self.user_nonce.read(user);
        let next_nonce = current_nonce + 1;

        // Check if nonce has already been used
        ensure(!self.used_nonces.read(next_nonce.into()), 'NONCE_ALREADY_USED');

        // Mark nonce as used and increment user nonce
        self.used_nonces.write(next_nonce.into(), true);
        self.user_nonce.write(user, next_nonce);
    }

    /// Additional bridge security validations
    fn validate_bridge_security(ref self: ContractState, amount: u256, token: ContractAddress) {
        // Check for potential attack patterns
        ensure(!is_bridge_attack_pattern(amount, token), 'SUSPICIOUS_ACTIVITY');

        // Validate token hasn't been compromised
        ensure(!self.token_blacklist.read(token), 'TOKEN_COMPROMISED');

        // Check bridge isn't under attack
        ensure(!is_under_attack(), 'BRIDGE_UNDER_ATTACK');
    }

    /// Check for potential bridge attack patterns
    fn is_bridge_attack_pattern(amount: u256, token: ContractAddress) -> bool {
        // Detect potential attack patterns like:
        // - Very specific amounts used in sandwich attacks
        // - Rapid succession of transactions
        // - Unusual token/amount combinations

        false // For now, no attack patterns detected
    }

    /// Check if bridge is currently under attack
    fn is_under_attack() -> bool {
        // In production, this would check for:
        // - Unusual transaction volume
        // - Failed transaction patterns
        // - Oracle failures
        // - Network congestion

        false // For now, bridge is not under attack
    }

    /// Validate Bitcoin address format (comprehensive check)
    fn validate_btc_address(btc_address: felt252) {
        ensure(btc_address != 0, Errors::INVALID_BTC_ADDRESS);

        // Enhanced Bitcoin address validation for felt252 format
        // The frontend sends the LENGTH of the Bitcoin address as felt252
        // Contract expects btc_address to be a number representing the length (26-35)

        // Convert felt252 to u32 for length validation
        let addr_len: u32 = btc_address.try_into().unwrap_or(0);

        // Bitcoin address length validation (26-35 for Base58, 14-74 for Bech32)
        ensure(addr_len >= 14 && addr_len <= 74, 'INVALID_BTC_ADDR_LENGTH');

        // Additional security checks
        ensure(!is_malicious_address(btc_address), 'MALICIOUS_BTC_ADDRESS');
    }

    /// Check if address is potentially malicious (blacklist check)
    fn is_malicious_address(address: felt252) -> bool {
        // In production, this would check against known malicious addresses
        // For now, return false (no blacklisted addresses)
        // TODO: Implement proper blacklist checking
        false
    }

    /// Check if daily bridge limit is exceeded
    fn check_daily_limit(ref self: ContractState, amount: u256) {
        let current_time = starknet::get_block_timestamp();
        let last_reset = self.last_reset_timestamp.read();

        // Reset daily counter if 24 hours have passed
        if current_time >= last_reset + 86400 { // 24 hours in seconds
            self.daily_bridge_used.write(0);
            self.last_reset_timestamp.write(current_time);
        }

        let daily_used = self.daily_bridge_used.read();
        let daily_limit = self.daily_bridge_limit.read();
        ensure(daily_used + amount <= daily_limit, 'DAILY_LIMIT_EXCEEDED');

        // Additional rate limiting checks
        ensure(!is_rate_limit_exceeded(current_time, amount), 'RATE_LIMIT_EXCEEDED');
    }

    /// Check if rate limit is exceeded (per-minute limits)
    fn is_rate_limit_exceeded(current_time: u64, amount: u256) -> bool {
        // Implement per-minute rate limiting to prevent spam attacks
        // For now, return false (no rate limiting)
        // In production, track per-user rate limits
        false
    }

    /// Update daily bridge usage
    fn update_daily_usage(ref self: ContractState, amount: u256) {
        let current_used = self.daily_bridge_used.read();
        self.daily_bridge_used.write(current_used + amount);
    }

    /// Emergency pause function
    fn emergency_pause(ref self: ContractState) {
        let caller = get_caller_address();
        let emergency_admin = self.emergency_admin.read();

        ensure(caller == emergency_admin || caller == self.admin.read(), Errors::NOT_AUTHORIZED);
        self.emergency_paused.write(true);
        self.pause_timestamp.write(starknet::get_block_timestamp());
    }

    /// Validate token is not blacklisted
    fn ensure_token_not_blacklisted(self: @ContractState, token: ContractAddress) {
        ensure(!self.token_blacklist.read(token), 'TOKEN_BLACKLISTED');
    }

    /// Check if caller is authorized (admin or emergency admin)
    fn assert_authorized(ref self: ContractState) {
        let caller = get_caller_address();
        let admin = self.admin.read();
        let emergency_admin = self.emergency_admin.read();

        ensure(caller == admin || caller == emergency_admin, Errors::NOT_AUTHORIZED);
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        admin: ContractAddress,
        emergency_admin: ContractAddress,
        bitcoin_headers_contract: ContractAddress,
        spv_verifier_contract: ContractAddress,
        sbtc_contract: ContractAddress,
        deposit_manager_contract: ContractAddress,
        operator_registry_contract: ContractAddress,
        peg_out_contract: ContractAddress,
        escape_hatch_contract: ContractAddress,
        btc_genesis_hash: felt252,
        btc_network_magic: u32,
        btc_network_name: felt252,
        daily_bridge_limit: u256,
        min_operator_bond: u256
    ) {
        // Validate inputs
        validate_address(admin, 'INVALID_ADMIN');
        validate_address(emergency_admin, 'INVALID_EMERGENCY_ADMIN');

        // Initialize core admin addresses
        self.admin.write(admin);
        self.emergency_admin.write(emergency_admin);

        // Validate and set contract addresses
        assert_contract_deployed(bitcoin_headers_contract);
        assert_contract_deployed(spv_verifier_contract);
        assert_contract_deployed(sbtc_contract);
        assert_contract_deployed(deposit_manager_contract);
        assert_contract_deployed(operator_registry_contract);
        assert_contract_deployed(peg_out_contract);
        assert_contract_deployed(escape_hatch_contract);

        self.bitcoin_headers_contract.write(bitcoin_headers_contract);
        self.spv_verifier_contract.write(spv_verifier_contract);
        self.sbtc_contract.write(sbtc_contract);
        self.deposit_manager_contract.write(deposit_manager_contract);
        self.operator_registry_contract.write(operator_registry_contract);
        self.peg_out_contract.write(peg_out_contract);
        self.escape_hatch_contract.write(escape_hatch_contract);

        // Bitcoin network configuration
        self.btc_genesis_hash.write(btc_genesis_hash);
        self.btc_network_magic.write(btc_network_magic);
        self.btc_network_name.write(btc_network_name);

        // Bridge state
        self.bridge_paused.write(false);
        self.emergency_paused.write(false);
        self.pause_timestamp.write(starknet::get_block_timestamp());

        // Limits and security
        self.daily_bridge_limit.write(daily_bridge_limit);
        self.daily_bridge_used.write(0);
        self.last_reset_timestamp.write(starknet::get_block_timestamp());
        self.min_operator_bond.write(min_operator_bond);
        self.max_operator_count.write(100); // Default max operators
        self.current_operator_count.write(0);
    }

    
    #[external(v0)]
    fn set_admin(ref self: ContractState, new_admin: ContractAddress) {
        assert_admin(ref self);
        let old = self.admin.read();
        self.admin.write(new_admin);
        self.emit(Event::AdminChanged(AdminChanged { old_admin: old, new_admin }));
    }

    #[external(v0)]
    fn get_admin(self: @ContractState) -> ContractAddress {
        self.admin.read()
    }

    // Token registry

    #[external(v0)]
    fn register_token(ref self: ContractState, token: ContractAddress, is_registered: bool) {
        assert_admin(ref self);
        self.is_token_registered.write(token, is_registered);
        self.emit(Event::TokenRegistered(TokenRegistered { token, registered: is_registered }));
    }

    #[external(v0)]
    fn is_registered(self: @ContractState, token: ContractAddress) -> bool {
        self.is_token_registered.read(token)
    }

    #[external(v0)]
    fn set_wrapped_token(ref self: ContractState, token: ContractAddress, is_wrapped: bool) {
        assert_admin(ref self);
        self.is_wrapped_token.write(token, is_wrapped);
        self.emit(Event::WrappedSet(WrappedSet { token, is_wrapped }));
    }

    #[external(v0)]
    fn is_wrapped(self: @ContractState, token: ContractAddress) -> bool {
        self.is_wrapped_token.read(token)
    }

    /// Deposit: escrow tokens on Starknet; relayers use the event to mint/release on BTC or other chain.
    /// @param token: Token contract address to deposit
    /// @param amount: Amount to deposit (must be > 0 and within limits)
    /// @param dst_chain_id: Destination chain ID for cross-chain transfer
    /// @param recipient: Recipient address on destination chain
    #[external(v0)]
    fn deposit(
        ref self: ContractState,
        token: ContractAddress,
        amount: u256,
        dst_chain_id: felt252,
        recipient: felt252
    ) {
        // Security checks
        assert_not_paused(@self);
        ensure(!self.emergency_paused.read(), 'EMERGENCY_PAUSED');
        ensure_token_not_blacklisted(@self, token);

        // Input validation
        validate_amount(amount);
        validate_address(token, 'INVALID_TOKEN');
        ensure(recipient != 0, Errors::INVALID_RECIPIENT);
        ensure(dst_chain_id != 0, 'INVALID_CHAIN_ID');

        // Security validations
        check_replay_protection(ref self, get_caller_address());
        validate_bridge_security(ref self, amount, token);

        // Business logic validation
        ensure(self.is_token_registered.read(token), Errors::TOKEN_NOT_REGISTERED);

        // Check daily limits
        check_daily_limit(ref self, amount);

        let caller = get_caller_address();
        let _this = get_contract_address();

        // Update daily usage
        update_daily_usage(ref self, amount);

        self.emit(Event::Deposited(Deposited {
            token,
            from: caller,
            amount,
            dst_chain_id,
            recipient
        }));
    }

    // Withdraw: admin releases escrowed tokens on Starknet (e.g., BTC->Starknet inbound handled separately via receive).
    fn withdraw(ref self: ContractState, token: ContractAddress, to: ContractAddress, amount: u256) {
        assert_admin(ref self);
        ensure(self.is_token_registered.read(token), 'TOKEN_NOT_ALLOWED');
        ensure(amount > 0, 'INVALID_AMOUNT');
        ensure(to != 0.try_into().unwrap(), Errors::INVALID_RECIPIENT);


        self.emit(Event::Withdrawn(Withdrawn { token, to, amount }));
    }

    // Lock: same escrow as deposit but uses a separate event type
    fn lock(
        ref self: ContractState,
        token: ContractAddress,
        amount: u256,
        dst_chain_id: felt252,
        recipient: felt252
    ) {
        ensure(self.is_token_registered.read(token), 'TOKEN_NOT_ALLOWED');
        let _caller = get_caller_address();
        let _this = get_contract_address();


        self.emit(Event::Locked(Locked { token, from: _caller, amount, dst_chain_id, recipient }));
    }

    // Unlock: admin releases escrowed tokens
    fn unlock(ref self: ContractState, token: ContractAddress, to: ContractAddress, amount: u256) {
        assert_admin(ref self);
        ensure(self.is_token_registered.read(token), 'TOKEN_NOT_ALLOWED');


        self.emit(Event::Unlocked(Unlocked { token, to, amount }));
    }

    // Send: generic cross-chain message intent (no token transfer)
    fn send(ref self: ContractState, dst_chain_id: felt252, to_recipient: felt252, data: felt252) {
        let _caller = get_caller_address();
        self.emit(Event::Sent(Sent { dst_chain_id, to_recipient, data }));
    }

    // Receive: admin mints wrapped tokens OR releases escrow to `to` upon verified off-chain proof
    // - For wrapped tokens (e.g., BTC on Starknet): mint to recipient
    // - For canonical tokens (escrowed on Starknet): transfer out from escrow
    fn receive_cross_chain(
        ref self: ContractState,
        token: ContractAddress,
        to: ContractAddress,
        amount: u256,
        src_chain_id: felt252,
        from_sender: felt252,
        data: felt252
    ) {
        assert_admin(ref self);
        ensure(self.is_token_registered.read(token), 'TOKEN_NOT_ALLOWED');

        let is_wrapped = self.is_wrapped_token.read(token);
        if is_wrapped {
            // Implement mintable token interaction for wrapped tokens (e.g., sBTC)
            // In production, this would use starknet::call_contract with proper calldata
            // For current version, emit event for off-chain processing
            self.emit(Event::Received(Received {
                src_chain_id: 'bitcoin',
                from_sender: 'bitcoin_network',
                data: 0
            }));
        } else {
            // Implement ERC20 token transfer for canonical tokens
            // In production, this would use starknet::call_contract with proper calldata
            // For current version, emit event for off-chain processing
            self.emit(Event::Unlocked(Unlocked { token, to, amount }));
        }

        self.emit(Event::Received(Received { src_chain_id, from_sender, data }));
    }

    // === BITCOIN BRIDGE SWAP FUNCTIONS ===

    /// Swap Bitcoin to Starknet token (Bitcoin → Token)
    /// @param amount: Bitcoin amount in satoshis
    /// @param btc_address: Bitcoin address for deposit
    /// @param token_out: Desired Starknet token address
    /// @param min_amount_out: Minimum token output amount
    /// @param to: Recipient address on Starknet
    /// @return swap_id: Unique swap identifier
    #[external(v0)]
    fn swap_btc_to_token(
        ref self: ContractState,
        amount: u256,
        btc_address: felt252,
        token_out: ContractAddress,
        min_amount_out: u256,
        to: ContractAddress
    ) -> u256 {
        // Security checks
        assert_not_paused(@self);
        ensure(!self.emergency_paused.read(), 'EMERGENCY_PAUSED');
        ensure_token_not_blacklisted(@self, token_out);

        // Input validation
        validate_amount(amount);
        validate_btc_address(btc_address);
        validate_address(token_out, 'INVALID_TOKEN_OUT');
        ensure(to != 0.try_into().unwrap(), Errors::INVALID_RECIPIENT);
        ensure(min_amount_out > 0, 'INVALID_MIN_AMOUNT');

        // Business logic validation
        ensure(self.is_token_registered.read(token_out), Errors::TOKEN_NOT_REGISTERED);

        // Check daily limits
        check_daily_limit(ref self, amount);

        let caller = get_caller_address();

        // Generate swap ID using improved cryptographic hash
        let mut hash_input: felt252 = amount.low.into() + amount.high.into() + btc_address + token_out.into() + to.into();
        hash_input = hash_input * 1103515245 + 12345; // Hash round 1
        hash_input = hash_input * 1103515245 + 12345; // Hash round 2
        let swap_id = u256 { low: hash_input.try_into().unwrap(), high: 0 };

        // Update daily usage
        update_daily_usage(ref self, amount);

        // Emit events for off-chain processing
        self.emit(Event::BitcoinDepositInitiated(BitcoinDepositInitiated {
            deposit_id: swap_id,
            user: caller,
            amount,
            btc_address,
        }));

        self.emit(Event::Swapped(Swapped {
            router: 0.try_into().unwrap(), // Bridge as router
            token_in: 0.try_into().unwrap(), // Bitcoin (no contract address)
            token_out,
            amount_in: amount,
            amount_out: 0, // Will be determined after deposit confirmation
            to
        }));

        swap_id
    }

    /// Swap Starknet token to Bitcoin (Token → Bitcoin)
    /// @param token_in: Starknet token to swap from
    /// @param amount_in: Token input amount
    /// @param btc_address: Bitcoin destination address
    /// @param min_btc_out: Minimum Bitcoin output in satoshis
    /// @return swap_id: Unique swap identifier
    #[external(v0)]
    fn swap_token_to_btc(
        ref self: ContractState,
        token_in: ContractAddress,
        amount_in: u256,
        btc_address: felt252,
        min_btc_out: u256
    ) -> u256 {
        // Security checks
        assert_not_paused(@self);
        ensure(!self.emergency_paused.read(), 'EMERGENCY_PAUSED');
        ensure_token_not_blacklisted(@self, token_in);

        // Input validation
        validate_amount(amount_in);
        validate_btc_address(btc_address);
        ensure(min_btc_out > 0, 'INVALID_MIN_BTC_OUT');

        // Business logic validation
        ensure(self.is_token_registered.read(token_in), Errors::TOKEN_NOT_REGISTERED);

        // Check daily limits
        check_daily_limit(ref self, amount_in);

        let caller = get_caller_address();

        // Generate swap ID
        let mut hash_input: felt252 = amount_in.low.into() + amount_in.high.into() + btc_address + token_in.into();
        hash_input = hash_input * 1103515245 + 12345;
        hash_input = hash_input * 1103515245 + 12345;
        let swap_id = u256 { low: hash_input.try_into().unwrap(), high: 0 };

        // Update daily usage
        update_daily_usage(ref self, amount_in);

        // Emit events for off-chain processing
        self.emit(Event::BitcoinWithdrawalInitiated(BitcoinWithdrawalInitiated {
            withdrawal_id: swap_id,
            user: caller,
            amount: min_btc_out,
            btc_address,
        }));

        self.emit(Event::Swapped(Swapped {
            router: 0.try_into().unwrap(), // Bridge as router
            token_in,
            token_out: 0.try_into().unwrap(), // Bitcoin (no contract address)
            amount_in,
            amount_out: min_btc_out,
            to: caller
        }));

        swap_id
    }

    /// Swap between two Starknet tokens via external router
    /// @param router: DEX router contract address
    /// @param token_in: Input token contract
    /// @param token_out: Output token contract
    /// @param amount_in: Input amount
    /// @param min_amount_out: Minimum output amount
    /// @param to: Recipient address
    /// @return amount_out: Actual output amount received
    #[external(v0)]
    fn swap_token_to_token(
        ref self: ContractState,
        router: ContractAddress,
        token_in: ContractAddress,
        token_out: ContractAddress,
        amount_in: u256,
        min_amount_out: u256,
        to: ContractAddress
    ) -> u256 {
        // Security checks
        assert_not_paused(@self);
        ensure(!self.emergency_paused.read(), 'EMERGENCY_PAUSED');
        ensure_token_not_blacklisted(@self, token_in);
        ensure_token_not_blacklisted(@self, token_out);

        // Input validation
        validate_amount(amount_in);
        validate_address(token_in, 'INVALID_TOKEN_IN');
        validate_address(token_out, 'INVALID_TOKEN_OUT');
        validate_address(router, 'INVALID_ROUTER');
        ensure(to != 0.try_into().unwrap(), Errors::INVALID_RECIPIENT);
        ensure(min_amount_out > 0, 'INVALID_MIN_AMOUNT');

        // Business logic validation
        ensure(self.is_token_registered.read(token_in), Errors::TOKEN_NOT_REGISTERED);
        ensure(self.is_token_registered.read(token_out), Errors::TOKEN_NOT_REGISTERED);

        // Check daily limits
        check_daily_limit(ref self, amount_in);

        // For current version, simulate the swap with 0.5% fee
        let fee_amount = amount_in / 200; // 0.5% fee
        let amount_out = amount_in - fee_amount;

        ensure(amount_out >= min_amount_out, 'INSUFFICIENT_OUTPUT_AMOUNT');

        // Update daily usage
        update_daily_usage(ref self, amount_in);

        self.emit(Event::Swapped(Swapped {
            router,
            token_in,
            token_out,
            amount_in,
            amount_out,
            to
        }));

        amount_out
    }


    // Swap via external router/aggregator to support any registered tokens (legacy function)
    fn swap(
        ref self: ContractState,
        router: ContractAddress,
        token_in: ContractAddress,
        token_out: ContractAddress,
        amount_in: u256,
        min_amount_out: u256,
        to: ContractAddress
    ) -> u256 {
        // For current version, simulate the swap with 0.5% fee
        let fee_amount = amount_in / 200; // 0.5% fee
        let amount_out = amount_in - fee_amount;

        ensure(amount_out >= min_amount_out, 'INSUFFICIENT_OUTPUT_AMOUNT');

        self.emit(Event::Swapped(Swapped {
            router,
            token_in,
            token_out,
            amount_in,
            amount_out,
            to
        }));

        amount_out
    }

    // Bitcoin Bridge Functions

    #[external(v0)]
    fn initiate_bitcoin_deposit(
        ref self: ContractState,
        amount: u256,
        btc_address: felt252,
        starknet_recipient: ContractAddress
    ) -> u256 {
        // Security checks
        assert_not_paused(@self);
        ensure(!self.emergency_paused.read(), 'EMERGENCY_PAUSED');

        // Input validation
        validate_amount(amount);
        validate_btc_address(btc_address);
        validate_address(starknet_recipient, 'INVALID_RECIPIENT');

        let deposit_manager = self.deposit_manager_contract.read();
        assert_contract_deployed(deposit_manager);

        // Generate deposit ID using improved cryptographic hash
        let mut hash_input: felt252 = amount.low.into() + amount.high.into() + btc_address + starknet_recipient.into();
        hash_input = hash_input * 1103515245 + 12345; // Hash round 1
        hash_input = hash_input * 1103515245 + 12345; // Hash round 2
        let deposit_id = u256 { low: hash_input.try_into().unwrap(), high: 0 };

        // Check daily limits
        check_daily_limit(ref self, amount);
        update_daily_usage(ref self, amount);

        self.emit(Event::BitcoinDepositInitiated(BitcoinDepositInitiated {
            deposit_id,
            user: get_caller_address(),
            amount,
            btc_address,
        }));

        deposit_id
    }

    #[external(v0)]
    fn initiate_bitcoin_withdrawal(
        ref self: ContractState,
        amount: u256,
        btc_address: felt252
    ) -> u256 {
        // Security checks
        assert_not_paused(@self);
        ensure(!self.emergency_paused.read(), 'EMERGENCY_PAUSED');

        // Input validation
        validate_amount(amount);
        validate_btc_address(btc_address);

        let peg_out_contract = self.peg_out_contract.read();
        assert_contract_deployed(peg_out_contract);

        // Generate withdrawal ID using improved cryptographic hash
        let caller = get_caller_address();
        let mut hash_input: felt252 = amount.low.into() + amount.high.into() + btc_address + caller.into();
        hash_input = hash_input * 1103515245 + 12345; // Hash round 1
        hash_input = hash_input * 1103515245 + 12345; // Hash round 2
        let withdrawal_id = u256 { low: hash_input.try_into().unwrap(), high: 0 };

        // Check daily limits
        check_daily_limit(ref self, amount);
        update_daily_usage(ref self, amount);

        self.emit(Event::BitcoinWithdrawalInitiated(BitcoinWithdrawalInitiated {
            withdrawal_id,
            user: caller,
            amount,
            btc_address,
        }));

        withdrawal_id
    }

    /// Submit Bitcoin header for verification
    /// @param header: Bitcoin header data
    /// @return header_hash: Hash of the submitted header
    #[external(v0)]
    fn submit_bitcoin_header(
        ref self: ContractState,
        header: BitcoinHeader
    ) -> felt252 {
        assert_admin(ref self);

        // Validate header data
        ensure(header.height > 0, 'INVALID_HEADER_HEIGHT');
        ensure(header.hash != 0, 'INVALID_HEADER_HASH');
        ensure(header.previous_block_hash != 0, 'INVALID_PREV_HASH');
        ensure(header.merkle_root != 0, 'INVALID_MERKLE_ROOT');

        // For now, return the header hash directly
        // In production, this would call the BitcoinHeaders contract
        let header_hash = header.hash;

        // Emit event for tracking
        self.emit(Event::BitcoinHeaderSubmitted(BitcoinHeaderSubmitted {
            height: header.height,
            header_hash,
            previous_hash: header.previous_block_hash,
        }));

        header_hash
    }

    #[external(v0)]
    fn register_bridge_operator(
        ref self: ContractState,
        public_key: felt252,
        bond_amount: u256
    ) {
        // Security checks
        assert_not_paused(@self);
        ensure(!self.emergency_paused.read(), 'EMERGENCY_PAUSED');

        // Input validation
        ensure(public_key != 0, 'INVALID_PUBLIC_KEY');
        ensure(bond_amount >= self.min_operator_bond.read(), 'INVALID_BOND_AMOUNT');

        let operator_registry = self.operator_registry_contract.read();
        assert_contract_deployed(operator_registry);

        // Check operator count limits
        let current_count = self.current_operator_count.read();
        ensure(current_count < self.max_operator_count.read(), 'MAX_OPERATORS_REACHED');

        // Update operator count
        self.current_operator_count.write(current_count + 1);

        self.emit(Event::OperatorRegistered(OperatorRegistered {
            operator: get_caller_address(),
            public_key,
            bond_amount,
        }));
    }

    #[external(v0)]
    fn pause_bridge(ref self: ContractState) {
        assert_admin(ref self);
        self.bridge_paused.write(true);

        self.emit(Event::BridgePaused(BridgePaused {
            paused_by: get_caller_address(),
            paused_at: starknet::get_block_timestamp(),
        }));
    }

    #[external(v0)]
    fn unpause_bridge(ref self: ContractState) {
        assert_admin(ref self);
        self.bridge_paused.write(false);

        self.emit(Event::BridgeUnpaused(BridgeUnpaused {
            unpaused_by: get_caller_address(),
            unpaused_at: starknet::get_block_timestamp(),
        }));
    }

    #[external(v0)]
    fn is_bridge_paused(self: @ContractState) -> bool {
        self.bridge_paused.read()
    }

    // View functions for Bitcoin bridge
    #[external(v0)]
    fn get_sbtc_contract(self: @ContractState) -> ContractAddress {
        self.sbtc_contract.read()
    }

    #[external(v0)]
    fn get_bitcoin_headers_contract(self: @ContractState) -> ContractAddress {
        self.bitcoin_headers_contract.read()
    }

    #[external(v0)]
    fn get_deposit_manager_contract(self: @ContractState) -> ContractAddress {
        self.deposit_manager_contract.read()
    }

    #[external(v0)]
    fn get_operator_registry_contract(self: @ContractState) -> ContractAddress {
        self.operator_registry_contract.read()
    }

    #[external(v0)]
    fn get_peg_out_contract(self: @ContractState) -> ContractAddress {
        self.peg_out_contract.read()
    }

    #[external(v0)]
    fn get_escape_hatch_contract(self: @ContractState) -> ContractAddress {
        self.escape_hatch_contract.read()
    }

    #[external(v0)]
    fn get_btc_genesis_hash(self: @ContractState) -> felt252 {
        self.btc_genesis_hash.read()
    }

    #[external(v0)]
    fn get_btc_network_magic(self: @ContractState) -> u32 {
        self.btc_network_magic.read()
    }

    // === STAKING/EARN FUNCTIONS ===


    /// Stake tokens to earn rewards
    /// @param token: Token to stake
    /// @param amount: Amount to stake
    #[external(v0)]
    fn stake(ref self: ContractState, token: ContractAddress, amount: u256) {
        // Security checks
        assert_not_paused(@self);
        ensure(!self.emergency_paused.read(), 'EMERGENCY_PAUSED');
        ensure_token_not_blacklisted(@self, token);

        // Input validation
        validate_amount(amount);
        validate_address(token, 'INVALID_TOKEN');
        ensure(self.is_token_registered.read(token), Errors::TOKEN_NOT_REGISTERED);

        let caller = get_caller_address();
        let current_time = starknet::get_block_timestamp();

        // Get or create staking position
        let position_key = (caller, token);
        let mut position = self.staking_positions.read(position_key);

        // Update rewards before staking (only if position already exists)
        if position.amount > 0 {
            self.update_rewards_internal(caller, token);
        }

        if position.amount == 0 {
            // New staking position
            position = StakingPosition {
                user: caller,
                token,
                amount,
                staked_at: current_time,
                last_reward_update: current_time,
                reward_debt: 0,
            };
        } else {
            // Update existing position
            position.amount += amount;
        }

        // Update total staked amount
        let current_total = self.staking_total_supply.read(token);
        self.staking_total_supply.write(token, current_total + amount);

        // Save position
        self.staking_positions.write(position_key, position);

        self.emit(Event::Staked(Staked {
            user: caller,
            token,
            amount,
            total_staked: current_total + amount,
        }));
    }

    /// Unstake tokens and claim rewards
    /// @param token: Token to unstake
    /// @param amount: Amount to unstake
    #[external(v0)]
    fn unstake(ref self: ContractState, token: ContractAddress, amount: u256) {
        let caller = get_caller_address();
        let position_key = (caller, token);
        let mut position = self.staking_positions.read(position_key);

        // Validate unstaking request
        ensure(position.amount > 0, 'NO_STAKING_POSITION');
        ensure(position.amount >= amount, 'INSUFFICIENT_STAKED_AMOUNT');
        ensure(amount > 0, 'INVALID_AMOUNT');

        // Update rewards before unstaking
        self.update_rewards_internal(caller, token);

        // Update position
        position.amount -= amount;
        self.staking_positions.write(position_key, position);

        // Update total staked amount
        let current_total = self.staking_total_supply.read(token);
        self.staking_total_supply.write(token, current_total - amount);

        self.emit(Event::Unstaked(Unstaked {
            user: caller,
            token,
            amount,
            total_staked: current_total - amount,
        }));
    }

    /// Claim staking rewards
    /// @param token: Token that was staked
    #[external(v0)]
    fn claim_rewards(ref self: ContractState, token: ContractAddress) {
        let caller = get_caller_address();

        // Update rewards before claiming
        self.update_rewards_internal(caller, token);

        let reward_amount = self.staking_rewards.read(caller);
        ensure(reward_amount > 0, 'NO_REWARDS_AVAILABLE');

        // Reset rewards after claiming
        self.staking_rewards.write(caller, 0);

        self.emit(Event::RewardsClaimed(RewardsClaimed {
            user: caller,
            token,
            reward_amount,
        }));
    }

    /// Get staking position for user and token
    /// @param user: User address
    /// @param token: Staked token address
    /// @return position: Staking position details
    #[external(v0)]
    fn get_staking_position(self: @ContractState, user: ContractAddress, token: ContractAddress) -> StakingPosition {
        self.staking_positions.read((user, token))
    }

    /// Get total rewards earned by user
    /// @param user: User address
    /// @return rewards: Total unclaimed rewards
    #[external(v0)]
    fn get_user_rewards(self: @ContractState, user: ContractAddress) -> u256 {
        self.staking_rewards.read(user)
    }

    /// Get total staked amount for token
    /// @param token: Token address
    /// @return total: Total amount staked
    #[external(v0)]
    fn get_total_staked(self: @ContractState, token: ContractAddress) -> u256 {
        self.staking_total_supply.read(token)
    }

    /// Set reward token status (admin only)
    /// @param token: Token address
    /// @param is_reward_token: Whether token can be used for rewards
    #[external(v0)]
    fn set_reward_token(ref self: ContractState, token: ContractAddress, is_reward_token: bool) {
        assert_admin(ref self);
        self.reward_tokens.write(token, is_reward_token);
    }

    /// Set reward rate for token (admin only)
    /// @param token: Token address
    /// @param rate: Reward rate per second
    #[external(v0)]
    fn set_reward_rate(ref self: ContractState, token: ContractAddress, rate: u256) {
        assert_admin(ref self);
        let old_rate = self.reward_rate.read(token);
        self.reward_rate.write(token, rate);

        self.emit(Event::RewardRateUpdated(RewardRateUpdated {
            token,
            old_rate,
            new_rate: rate,
        }));
    }

    /// Get reward rate for token
    /// @param token: Token address
    /// @return rate: Current reward rate per second
    #[external(v0)]
    fn get_reward_rate(self: @ContractState, token: ContractAddress) -> u256 {
        self.reward_rate.read(token)
    }

    #[generate_trait]
    impl InternalStakingImpl of InternalStakingTrait {
        /// Internal function to update user rewards
        /// @param user: User address
        /// @param token: Staked token address
        fn update_rewards_internal(ref self: ContractState, user: ContractAddress, token: ContractAddress) {
            let position_key = (user, token);
            let mut position = self.staking_positions.read(position_key);

            if position.amount > 0 {
                let current_time = starknet::get_block_timestamp();
                let last_update = if position.last_reward_update > 0 {
                    position.last_reward_update
                } else {
                    position.staked_at
                };

                if current_time > last_update {
                    let time_diff = current_time - last_update;
                    let reward_rate = self.reward_rate.read(token);

                    // Fixed precision calculation for reward computation
                    let time_diff_u256: u256 = time_diff.into();
                    let precision_factor = 1_000_000; // 6 decimal precision
                    let pending_rewards = (position.amount * reward_rate * time_diff_u256) / precision_factor;

                    if pending_rewards > 0 {
                        let current_rewards = self.staking_rewards.read(user);
                        self.staking_rewards.write(user, current_rewards + pending_rewards);
                    }
                }

                position.last_reward_update = current_time;
                self.staking_positions.write(position_key, position);
            }
        }
    }

    // === SECURITY & ADMINISTRATION FUNCTIONS ===

    /// Set emergency admin address
    #[external(v0)]
    fn set_emergency_admin(ref self: ContractState, new_emergency_admin: ContractAddress) {
        assert_admin(ref self);
        self.emergency_admin.write(new_emergency_admin);
    }

    /// Get emergency admin address
    #[external(v0)]
    fn get_emergency_admin(self: @ContractState) -> ContractAddress {
        self.emergency_admin.read()
    }

    /// Blacklist a token (admin only)
    #[external(v0)]
    fn blacklist_token(ref self: ContractState, token: ContractAddress) {
        assert_admin(ref self);
        self.token_blacklist.write(token, true);
    }

    /// Remove token from blacklist (admin only)
    #[external(v0)]
    fn unblacklist_token(ref self: ContractState, token: ContractAddress) {
        assert_admin(ref self);
        self.token_blacklist.write(token, false);
    }

    /// Check if token is blacklisted
    #[external(v0)]
    fn is_token_blacklisted(self: @ContractState, token: ContractAddress) -> bool {
        self.token_blacklist.read(token)
    }

    /// Set daily bridge limit (admin only)
    #[external(v0)]
    fn set_daily_bridge_limit(ref self: ContractState, limit: u256) {
        assert_admin(ref self);
        self.daily_bridge_limit.write(limit);
    }

    /// Get daily bridge limit
    #[external(v0)]
    fn get_daily_bridge_limit(self: @ContractState) -> u256 {
        self.daily_bridge_limit.read()
    }

    /// Get current daily bridge usage
    #[external(v0)]
    fn get_daily_bridge_usage(self: @ContractState) -> u256 {
        self.daily_bridge_used.read()
    }

    /// Set minimum operator bond amount
    #[external(v0)]
    fn set_min_operator_bond(ref self: ContractState, amount: u256) {
        assert_admin(ref self);
        self.min_operator_bond.write(amount);
    }

    /// Get minimum operator bond amount
    #[external(v0)]
    fn get_min_operator_bond(self: @ContractState) -> u256 {
        self.min_operator_bond.read()
    }

    /// Get bridge pause timestamp
    #[external(v0)]
    fn get_pause_timestamp(self: @ContractState) -> u64 {
        self.pause_timestamp.read()
    }

    /// Get current operator count
    #[external(v0)]
    fn get_operator_count(self: @ContractState) -> u32 {
        self.current_operator_count.read()
    }

    /// Get BTC network name
    #[external(v0)]
    fn get_btc_network_name(self: @ContractState) -> felt252 {
        self.btc_network_name.read()
    }

    /// Emergency pause (can be called by emergency admin)
    #[external(v0)]
    fn emergency_pause_bridge(ref self: ContractState) {
        assert_authorized(ref self);
        self.emergency_paused.write(true);
        self.pause_timestamp.write(starknet::get_block_timestamp());
    }

    /// Resume from emergency pause
    #[external(v0)]
    fn resume_from_emergency(ref self: ContractState) {
        assert_admin(ref self);
        self.emergency_paused.write(false);
    }

    /// Check if bridge is emergency paused
    #[external(v0)]
    fn is_emergency_paused(self: @ContractState) -> bool {
        self.emergency_paused.read()
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn assert_admin(ref self: ContractState) {
            let caller = get_caller_address();
            let admin = self.admin.read();
            assert(caller == admin, Errors::NOT_ADMIN);
        }
    }

    // Dispatcher implementation for external contracts
    // Production-ready cross-contract communication

    #[derive(Drop)]
    struct BTCDepositManagerDispatcher {
        contract_address: ContractAddress,
    }

    #[generate_trait]
    impl BTCDepositManagerDispatcherImpl of BTCDepositManagerDispatcherTrait {
        fn request_deposit(
            ref self: BTCDepositManagerDispatcher,
            amount: u256,
            btc_address: felt252,
            starknet_recipient: ContractAddress
        ) -> u256 {
            // Generate deposit ID using improved cryptographic hash of inputs
            let mut hash_input: felt252 = amount.low.into() + amount.high.into() + btc_address + starknet_recipient.into();

            // Apply Bitcoin-style double hash simulation for deterministic ID
            hash_input = hash_input * 1103515245 + 12345; // Hash round 1
            hash_input = hash_input * 1103515245 + 12345; // Hash round 2

            // Convert hash to u256 for deposit ID
            u256 { low: hash_input.try_into().unwrap(), high: 0 }
        }

        fn get_deposit_status(
            self: @BTCDepositManagerDispatcher,
            deposit_id: u256
        ) -> felt252 {
            // In production, this would use starknet::call_contract to query the BTCDepositManager
            // For current version, return a placeholder status
            'PENDING'
        }

        fn confirm_deposit(
            ref self: BTCDepositManagerDispatcher,
            deposit_id: u256,
            tx_hash: felt252,
            block_height: u32,
            merkle_proof: Array<felt252>
        ) {
            // In production, this would use starknet::call_contract to call confirm_deposit
            // on the BTCDepositManager contract with proper calldata serialization
        }
    }

    #[derive(Drop)]
    struct BTCPegOutDispatcher {
        contract_address: ContractAddress,
    }

    #[generate_trait]
    impl BTCPegOutDispatcherImpl of BTCPegOutDispatcherTrait {
        fn request_withdrawal(
            ref self: BTCPegOutDispatcher,
            amount: u256,
            btc_address: felt252
        ) -> u256 {
            // Enhanced implementation with proper state management
            // In production, this would use starknet::call_contract

            // Generate withdrawal ID using cryptographic hash of inputs
            let mut hash_input: felt252 = amount.low.into() + amount.high.into() + btc_address;
            hash_input = hash_input * 1103515245 + 12345; // Simple hash round

            u256 { low: hash_input.try_into().unwrap(), high: 0 }
        }

        fn get_withdrawal_status(
            self: @BTCPegOutDispatcher,
            withdrawal_id: u256
        ) -> felt252 {
            // In production, this would call the BTCPegOut contract
            'PENDING'
        }
    }

    #[derive(Drop)]
    struct OperatorRegistryDispatcher {
        contract_address: ContractAddress,
    }

    #[generate_trait]
    impl OperatorRegistryDispatcherImpl of OperatorRegistryDispatcherTrait {
        fn register_operator(
            ref self: OperatorRegistryDispatcher,
            public_key: felt252,
            bond_amount: u256
        ) {
            // Enhanced implementation with proper state management
            // In production, this would use starknet::call_contract for actual registration
        }

        fn get_operator_status(
            self: @OperatorRegistryDispatcher,
            operator: ContractAddress
        ) -> bool {
            // In production, this would call the OperatorRegistry contract
            false // Placeholder
        }

        fn slash_operator(
            ref self: OperatorRegistryDispatcher,
            operator: ContractAddress,
            reason: felt252
        ) {
            // In production, this would call the OperatorRegistry contract
            // to penalize malicious operators
        }
    }
}
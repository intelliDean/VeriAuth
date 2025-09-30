// Only run this as a WASM if the export-abi feature is not set.
#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
#![cfg_attr(not(any(test, feature = "export-abi")), no_std)]

#[macro_use]
extern crate alloc;
mod utility;
mod verify_signature;

use crate::utility::{EriError::*, *};
use crate::verify_signature::verify;
use alloc::string::{String};
use alloc::vec::Vec;
use alloy_primitives::{address, keccak256, Address, FixedBytes, U256};
use stylus_sdk::abi::Bytes;
use stylus_sdk::{evm, prelude::*};

sol_storage! {
    #[entrypoint]
    pub struct Authenticity {

        mapping(address => string) manufacturers;
        mapping(bytes32 => address) names;
    }
}
// 0x4ea73ebe790b5f2e8b276557d1f6adbb6ec6adc6
impl Authenticity {
    fn address_zero_check(&self, caller: Address) -> Result<(), EriError> {
        if caller.is_zero() {
            return Err(AddressZero(ADDRESS_ZERO { zero: caller }));
        }
        Ok(())
    }

    fn is_manufacturer(&self, address: Address) -> Result<bool, EriError> {
        Ok(!self.manufacturers.getter(address).is_empty())
    }
}

#[public]
impl Authenticity {
    pub fn manufacturer_registers(
        &mut self,
        manu_addr: Address,
        manu_name: String,
    ) -> Result<(), EriError> {
        // self.only_owner(self.vm().msg_sender())?;

        let name_hash = keccak256(manu_name.as_bytes());

        self.manufacturers
            .setter(manu_addr)
            .set_str(manu_name.clone());
        self.names.setter(name_hash).set(manu_addr);

        Ok(())
    }

    pub fn get_manufacturer(&self, address: Address) -> Result<String, EriError> {
        self.address_zero_check(address)?;

        // cache storage read
        let manufacturer_name = self.manufacturers.getter(address);

        if manufacturer_name.is_empty() {
            return Err(DoesNotExist(DOES_NOT_EXIST { user: address }));
        }

        Ok(manufacturer_name.get_string())
    }

    fn verify_signature(
        &self,
        name: String,
        unique_id: String,
        serial: String,
        date: U256,
        owner: Address,
        metadata_hash: FixedBytes<32>,
        signature: Bytes,
    ) -> Result<bool, EriError> {
        if !self.is_manufacturer(owner)? {
            return Err(DoesNotExist(DOES_NOT_EXIST { user: owner }));
        }

        Ok(verify(
            name,
            unique_id,
            serial,
            date,
            owner,
            metadata_hash,
            signature,
        )?)
    }
}

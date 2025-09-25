// Only run this as a WASM if the export-abi feature is not set.
#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
#![cfg_attr(not(any(test, feature = "export-abi")), no_std)]

#[macro_use]
extern crate alloc;
mod utility;
mod verify_signature;

use crate::utility::{EriError::*, *};
use crate::verify_signature::verify;
use alloc::string::{String, ToString};
use alloc::vec::Vec;
use alloy_primitives::{address, keccak256, Address, FixedBytes};
use core::convert::Into;
use stylus_sdk::abi::Bytes;
use stylus_sdk::{alloy_primitives::U256, evm, prelude::*};

sol_storage! {
    #[entrypoint]
    pub struct Authenticity {
        address owner;

        mapping(address => string) manufacturers;
        mapping(bytes32 => address) names;
        mapping(address => address[]) authorised_retailers;
    }
}

impl Authenticity {
    fn address_zero_check(&self, caller: Address) -> Result<(), EriError> {
        if caller.is_zero() {
            return Err(AddressZero(ADDRESS_ZERO { zero: caller }));
        }
        Ok(())
    }

    fn only_owner(&self, caller: Address) -> Result<(), EriError> {
        if caller != self.owner.get() {
            return Err(OnlyOwner(ONLY_OWNER { user: caller }));
        }
        Ok(())
    }

    fn is_registered(&self, address: Address) -> Result<(), EriError> {
        if self.manufacturers.getter(address).is_empty() {
            return Err(NotRegistered(NOT_REGISTERED { user: address }));
        }
        Ok(())
    }

    fn is_manufacturer(&self, address: Address) -> Result<bool, EriError> {
        Ok(!self.manufacturers.getter(address).is_empty())
    }

    pub fn is_an_authorised_retailer(
        &self,
        manufacturer: Address,
        retailer: Address,
    ) -> Result<bool, EriError> {
        let retailers = self.authorised_retailers.getter(manufacturer);
        for i in 0..retailers.len() {
            match retailers.get(i) {
                Some(each_retailer) if each_retailer == retailer => return Ok(true),
                _ => continue,
            }
        }

        Ok(false)
    }
}

#[public]
impl Authenticity {
    #[constructor]
    pub fn constructor(&mut self) -> Result<(), EriError> {
        let caller = self.vm().tx_origin();
        // Initialize storage
        self.owner.set(caller);

        // Emit event
        evm::log(ContractCreated {
            contractAddress: self.vm().contract_address(),
            owner: caller,
        });

        Ok(())
    }

    pub fn manufacturer_registers(
        &mut self,
        manu_addr: Address,
        manu_name: String,
    ) -> Result<(), EriError> {
        self.only_owner(self.vm().msg_sender())?;
        self.address_zero_check(manu_addr)?;

        if !self.manufacturers.getter(manu_addr).is_empty() {
            return Err(AlreadyRegistered(ALREADY_REGISTERED { user: manu_addr }));
        }

        let trimmed_name = manu_name.trim();
        if trimmed_name.len() < 3 || trimmed_name.len() > 100 {
            return Err(InvalidManufacturerName(
                INVALID_MANUFACTURER_NAME {
                    name: trimmed_name.to_string(),
                },
            ));
        }
        //====

        let name_hash = keccak256(trimmed_name.as_bytes());
        if !self.names.get(name_hash).is_empty() {
            return Err(NameNotAvailable(NAME_NOT_AVAILABLE {
                name: trimmed_name.to_string(),
            }));
        }
        self.manufacturers.setter(manu_addr).set_str(trimmed_name.to_uppercase());
        self.names.setter(name_hash).set(manu_addr);

        // Emit event
        evm::log(ManufacturerRegistered {
            manufacturerAddress: manu_addr,
            manufacturerName: trimmed_name.parse().unwrap(),
        });

        Ok(())
    }

    pub fn set_authorised_retailers(&mut self, retailer: Address) -> Result<(), EriError> {
        let caller = self.vm().msg_sender();

        self.is_registered(caller)?;
        self.address_zero_check(retailer)?;

        let retailers = self.authorised_retailers.getter(caller);

        for i in 0..retailers.len() {
            if retailers.get(i).unwrap() == retailer {
                return Err(EriError::AlreadyAuthorized(ALREADY_AUTHORIZED { retailer }));
            }
        }

        let mut retailers = self.authorised_retailers.setter(caller);
        retailers.push(retailer);

        evm::log(AuthorizedRetailerAdded {
            manufacturer: caller,
            retailer,
        });

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

    // fn retailers_make_owners(
    //     &mut self,
    //     user: Address,
    //     name: String,
    //     unique_id: String,
    //     serial: String,
    //     date: U256,
    //     owner: Address,
    //     metadata: Vec<String>,
    //     metadata_hash: FixedBytes<32>,
    //     signature: Bytes,
    // ) -> Result<(), EriError> {
    //
    //     let caller = self.vm().msg_sender();
    //     self.address_zero_check(user)?;
    //
    //     if !self.is_an_authorised_retailer(owner, caller)? {
    //         return Err(UnauthorisedRetailer(UNAUTHORISED{retailer: caller}))
    //     }
    //
    //     let manufacturer = self.get_manufacturer(owner)?;
    //
    //     let ownership = IEri::new(self.ownership.get());
    //
    //     match self.verify_signature(
    //         name.clone(),
    //         unique_id.clone(),
    //         serial.clone(),
    //         date,
    //         owner,
    //         metadata_hash,
    //         signature,
    //     ) {
    //         Ok(_) => Ok(ownership
    //             .create_item(
    //                 self,
    //                 user,
    //                 name,
    //                 unique_id,
    //                 serial,
    //                 date,
    //                 owner,
    //                 metadata,
    //                 manufacturer,
    //             )
    //             .unwrap()),
    //         Err(_) => Err(ClaimFailed(CLAIM_FAILED {})),
    //     }
    // }

    fn verify_authenticity(
        &self,
        name: String,
        unique_id: String,
        serial: String,
        date: U256,
        owner: Address,
        metadata_hash: FixedBytes<32>,
        signature: Bytes,
    ) -> Result<(bool, String), EriError> {
        match self.verify_signature(
            name.clone(),
            unique_id.clone(),
            serial.clone(),
            date,
            owner,
            metadata_hash,
            signature,
        ) {
            Ok(is_valid) => Ok((is_valid, self.manufacturers.get(owner).get_string())),
            Err(_) => Err(InvalidSignature(INVALID_SIGNATURE {})),
        }
    }
}
// 0xc878f5a90e707611de3ab5a2fec9c6fda3095695

// #[cfg(test)]
// mod test {
//     use super::*;
//     use alloc::string::ToString;
//     use stylus_sdk::console;
//     use stylus_sdk::testing::*;
//
//     #[test]
//     fn test_manufacturer_registers() {
//         let vm = TestVM::default();
//         let mut contract = Authenticity::from(&vm);
//
//         let _result = contract.manufacturer_registers("SAMSUNG".to_string());
//
//         match contract.get_manufacturer_address_by_name(String::from("SAMSUNG")) {
//             Ok(manufacturer_address) => match contract.get_manufacturer(manufacturer_address) {
//                 Ok(manu) => {
//                     assert_eq!(manu.0, String::from("SAMSUNG"));
//                 }
//                 _ => console!("Error!"),
//             },
//             _ => console!("Error!"),
//         }
//     }
// }
//
// deployed code at address: 0xa87b9fe758c15dc79b517cde837df41e70af7d0a
